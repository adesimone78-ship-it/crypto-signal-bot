const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const MARGIN = 600.97;
const ORDER_EUR = 1201.94;

let positions = [];
let closedPositions = [];
let lastUpdateId = 0;
let processedIds = new Set();

// === ATR per asset ===
const atrMap = {
  BTC: 0.018, ETH: 0.018, SOL: 0.022,
  XAU: 0.004, XAGUSD: 0.006,
  NAS100: 0.0035, US100: 0.0035, USOIL: 0.008,
  DEFAULT: 0.018
};

// === Suffisso corretto per asset ===
function getAssetSuffix(asset) {
 const fiat = ['XAU', 'XAGUSD', 'NAS100', 'US100', 'USOIL', 'EURUSD', 'GBPUSD'];
  return fiat.includes(asset) ? 'USD' : 'USDT';
}

// === Timestamp italiano ===
function nowIT() {
  return new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// === Calcolo livelli TP/SL ===
function calcLevels(entry, direction, asset) {
  const atrPct = atrMap[asset] || atrMap.DEFAULT;
  const slDist = entry * atrPct;
  const tpDist = slDist * 3;
  const sl = direction === 'LONG' ? +(entry - slDist).toFixed(2) : +(entry + slDist).toFixed(2);
  const tp = direction === 'LONG' ? +(entry + tpDist).toFixed(2) : +(entry - tpDist).toFixed(2);
  return {
    sl, tp,
    slEur: +(slDist / entry * ORDER_EUR).toFixed(2),
    tpEur: +(tpDist / entry * ORDER_EUR).toFixed(2),
    slPct: +(slDist / entry * 100).toFixed(2),
    tpPct: +(tpDist / entry * 100).toFixed(2)
  };
}

// === Prezzo attuale — supporta tutti gli asset ===
async function getPrice(asset) {
  try {
    const cryptoMap = {
      BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana',
      BNB: 'binancecoin', XRP: 'ripple'
    };

    if (cryptoMap[asset]) {
      const id = cryptoMap[asset];
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + id + '&vs_currencies=usd');
      const data = await res.json();
      return data[id].usd;
    }

    // Per XAU, XAGUSD, NAS100, USOIL usa Yahoo Finance via API pubblica
const yahooMap = {
  XAU: 'GC=F', XAGUSD: 'SI=F',
  NAS100: 'NQ=F', US100: 'NQ=F', USOIL: 'CL=F'
};

    if (yahooMap[asset]) {
      const symbol = yahooMap[asset];
      const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + symbol + '?interval=1m&range=1d');
      const data = await res.json();
      return data.chart.result[0].meta.regularMarketPrice;
    }

    console.warn('Asset non supportato per price check:', asset);
    return null;
  } catch (e) {
    console.error('Errore getPrice:', asset, e.message);
    return null;
  }
}

// === Invia messaggio Telegram ===
async function sendTelegram(text) {
  try {
    const response = await fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML' })
    });
    const data = await response.json();
    console.log('Telegram:', JSON.stringify(data));
    return data;
  } catch (e) {
    console.error('Errore Telegram:', e.message);
  }
}

// === Messaggio ingresso ===
function buildEntryMessage(asset, direction, entry, lv) {
  const emoji = direction === 'LONG' ? '📈' : '📉';
  const arrow = direction === 'LONG' ? '▲' : '▼';
  const suffix = getAssetSuffix(asset);
  return '🤖 <b>SIGNAL BOT — ' + asset + '/' + suffix + '</b>\n' +
    '━━━━━━━━━━━━━━━━━━\n' +
    emoji + ' Direzione: ' + arrow + ' ' + direction + '\n' +
    '🕐 Orario: ' + nowIT() + '\n' +
    '💰 Ingresso:    $' + entry.toLocaleString('it-IT') + '\n' +
    '🛑 Stop Loss:   $' + lv.sl.toLocaleString('it-IT') + '  (-' + lv.slPct + '% / -€' + lv.slEur + ')\n' +
    '🎯 Take Profit: $' + lv.tp.toLocaleString('it-IT') + '  (+' + lv.tpPct + '% / +€' + lv.tpEur + ')\n' +
    '⚖️ R:R → 3 : 1\n' +
    '💼 Margine: €' + MARGIN + ' | Ordine: €' + ORDER_EUR + '\n' +
    '━━━━━━━━━━━━━━━━━━\n' +
    '⚠️ Non è consulenza finanziaria.';
}

// === Messaggio chiusura ===
function buildCloseMessage(pos, result, closePrice, pnlEur) {
  const emoji = result === 'WIN' ? '✅' : '❌';
  const pnlStr = pnlEur >= 0 ? '+€' + pnlEur.toFixed(2) : '-€' + Math.abs(pnlEur).toFixed(2);
  const suffix = getAssetSuffix(pos.asset);
  const duration = Math.round((new Date() - new Date(pos.openedAt)) / 60000);
  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  const durStr = hours > 0 ? hours + 'h ' + mins + 'min' : mins + 'min';
  return emoji + ' <b>POSIZIONE CHIUSA — ' + pos.asset + '/' + suffix + '</b>\n' +
    '━━━━━━━━━━━━━━━━━━\n' +
    '📊 Direzione: ' + pos.direction + '\n' +
    '💰 Ingresso:  $' + pos.entry.toLocaleString('it-IT') + '\n' +
    '🏁 Uscita:    $' + closePrice.toLocaleString('it-IT') + '\n' +
    '⏱ Durata:    ' + durStr + '\n' +
    (result === 'WIN' ? '🎯 Take Profit raggiunto' : '🛑 Stop Loss raggiunto') + '\n' +
    '💶 P&L: <b>' + pnlStr + '</b>\n' +
    '━━━━━━━━━━━━━━━━━━';
}

// === Resoconto ===
function buildReport(label, filtered) {
  if (filtered.length === 0) {
    return '📊 <b>RESOCONTO ' + label + '</b>\n━━━━━━━━━━━━━━━━━━\nNessuna posizione chiusa nel periodo.';
  }
  const wins = filtered.filter(p => p.result === 'WIN').length;
  const losses = filtered.filter(p => p.result === 'LOSS').length;
  const totalPnl = filtered.reduce((a, p) => a + p.pnlEur, 0);
  const grossWin = filtered.filter(p => p.result === 'WIN').reduce((a, p) => a + p.pnlEur, 0);
  const grossLoss = filtered.filter(p => p.result === 'LOSS').reduce((a, p) => a + p.pnlEur, 0);
  const winRate = ((wins / filtered.length) * 100).toFixed(1);
  const pf = grossLoss !== 0 ? (grossWin / Math.abs(grossLoss)).toFixed(2) : '∞';
  const pnlStr = totalPnl >= 0 ? '+€' + totalPnl.toFixed(2) : '-€' + Math.abs(totalPnl).toFixed(2);
  return '📊 <b>RESOCONTO ' + label + '</b>\n' +
    '━━━━━━━━━━━━━━━━━━\n' +
    '📈 Trade totali: ' + filtered.length + '\n' +
    '✅ Win: ' + wins + '  |  ❌ Loss: ' + losses + '\n' +
    '🎯 Win Rate: ' + winRate + '%\n' +
    '💶 P&L Totale: <b>' + pnlStr + '</b>\n' +
    '📈 Profitto lordo: +€' + grossWin.toFixed(2) + '\n' +
    '📉 Perdita lorda: -€' + Math.abs(grossLoss).toFixed(2) + '\n' +
    '⚖️ Profit Factor: ' + pf + '\n' +
    '━━━━━━━━━━━━━━━━━━';
}

// === Posizioni aperte ===
function buildOpenPositions() {
  if (positions.length === 0) {
    return '📋 <b>POSIZIONI APERTE</b>\n━━━━━━━━━━━━━━━━━━\nNessuna posizione aperta.';
  }
  let msg = '📋 <b>POSIZIONI APERTE (' + positions.length + ')</b>\n━━━━━━━━━━━━━━━━━━\n';
  positions.forEach((pos, i) => {
    const suffix = getAssetSuffix(pos.asset);
    const duration = Math.round((new Date() - new Date(pos.openedAt)) / 60000);
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    const durStr = hours > 0 ? hours + 'h ' + mins + 'min' : mins + 'min';
    msg += (i + 1) + '. <b>' + pos.asset + '/' + suffix + '</b> ' + pos.direction + '\n';
    msg += '   💰 Entry: $' + pos.entry.toLocaleString('it-IT') + '\n';
    msg += '   🛑 SL: $' + pos.sl.toLocaleString('it-IT') + ' | 🎯 TP: $' + pos.tp.toLocaleString('it-IT') + '\n';
    msg += '   ⏱ Aperta da: ' + durStr + '\n';
    if (i < positions.length - 1) msg += '─────────────────\n';
  });
  msg += '━━━━━━━━━━━━━━━━━━';
  return msg;
}

function getFiltered(type) {
  const now = new Date();
  const from = new Date();
  if (type === 'day') from.setHours(0, 0, 0, 0);
  else if (type === 'week') from.setDate(now.getDate() - 7);
  else if (type === 'month') from.setMonth(now.getMonth() - 1);
  else if (type === 'year') from.setFullYear(now.getFullYear() - 1);
  return closedPositions.filter(p => new Date(p.closedAt) >= from);
}

// === Check posizioni ogni 3 minuti ===
async function checkPositions() {
  if (positions.length === 0) return;
  for (let i = positions.length - 1; i >= 0; i--) {
    const pos = positions[i];
    try {
      const price = await getPrice(pos.asset);
      if (price === null) continue;
      let result = null;
      let closePrice = price;
      if (pos.direction === 'LONG') {
        if (price >= pos.tp) { result = 'WIN'; closePrice = pos.tp; }
        else if (price <= pos.sl) { result = 'LOSS'; closePrice = pos.sl; }
      } else {
        if (price <= pos.tp) { result = 'WIN'; closePrice = pos.tp; }
        else if (price >= pos.sl) { result = 'LOSS'; closePrice = pos.sl; }
      }
      if (result) {
        const priceDiff = result === 'WIN'
          ? (pos.direction === 'LONG' ? pos.tp - pos.entry : pos.entry - pos.tp)
          : (pos.direction === 'LONG' ? pos.sl - pos.entry : pos.entry - pos.sl);
        const pnlEur = +(priceDiff / pos.entry * ORDER_EUR).toFixed(2);
        closedPositions.push(Object.assign({}, pos, { result, closePrice, pnlEur, closedAt: new Date() }));
        positions.splice(i, 1);
        await sendTelegram(buildCloseMessage(pos, result, closePrice, pnlEur));
      }
    } catch (e) {
      console.error('Errore check:', e.message);
    }
  }
}

// === Polling Telegram ===
async function pollTelegram() {
  try {
    const res = await fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/getUpdates?offset=' + (lastUpdateId + 1) + '&timeout=0');
    const data = await res.json();
    if (!data.ok || !data.result.length) return;
    for (const update of data.result) {
      lastUpdateId = update.update_id;
      if (processedIds.has(update.update_id)) continue;
      processedIds.add(update.update_id);
      const message = update.channel_post;
      if (!message || !message.text) continue;
      const text = message.text.trim().toLowerCase();
      let reply = null;
      if (text === '/giorno') reply = buildReport('GIORNALIERO', getFiltered('day'));
      else if (text === '/settimana') reply = buildReport('SETTIMANALE', getFiltered('week'));
      else if (text === '/mese') reply = buildReport('MENSILE', getFiltered('month'));
      else if (text === '/anno') reply = buildReport('ANNUALE', getFiltered('year'));
      else if (text === '/aperte') reply = buildOpenPositions();
      if (reply) {
        console.log('Invio risposta a:', text, 'update_id:', update.update_id);
        await sendTelegram(reply);
      }
    }
  } catch (e) {
    console.error('Errore polling:', e.message);
  }
}

// === Webhook segnale ===
app.post('/webhook', async (req, res) => {
  try {
    const { asset, direction, entry } = req.body;
    if (!asset || !direction || !entry) {
      return res.status(400).json({ error: 'Parametri mancanti' });
    }
    const assetUp = asset.toUpperCase();
    const dir = direction.toUpperCase();
    const entryNum = parseFloat(entry);

    // Blocca doppio segnale stesso asset
    const existing = positions.find(p => p.asset === assetUp);
    if (existing) {
      console.log('Segnale ignorato — posizione già aperta su:', assetUp);
      return res.json({ ok: true, skipped: true, reason: 'posizione già aperta' });
    }

    const lv = calcLevels(entryNum, dir, assetUp);
    positions.push({ asset: assetUp, direction: dir, entry: entryNum, sl: lv.sl, tp: lv.tp, openedAt: new Date() });
    await sendTelegram(buildEntryMessage(assetUp, dir, entryNum, lv));
    res.json({ ok: true });
  } catch (e) {
    console.error('Errore webhook:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => res.send('Bot attivo ✅'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log('Server avviato porta ' + PORT);
  await fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/deleteWebhook');
  console.log('Webhook rimosso, polling attivo');
  setInterval(checkPositions, 3 * 60 * 1000);
  setInterval(pollTelegram, 3000);
});
