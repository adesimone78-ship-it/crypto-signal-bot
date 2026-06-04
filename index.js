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

function calcLevels(entry, direction) {
  const slDist = entry * 0.018;
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

async function getPrice(asset) {
  const id = asset === 'BTC' ? 'bitcoin' : 'ethereum';
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + id + '&vs_currencies=usd');
  const data = await res.json();
  return data[id].usd;
}

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

function buildEntryMessage(asset, direction, entry, lv) {
  const emoji = direction === 'LONG' ? '📈' : '📉';
  const arrow = direction === 'LONG' ? '▲' : '▼';
  return '🤖 <b>SIGNAL BOT — ' + asset + '/USDT</b>\n' +
    '━━━━━━━━━━━━━━━━━━\n' +
    emoji + ' Direzione: ' + arrow + ' ' + direction + '\n' +
    '💰 Ingresso:    $' + entry.toLocaleString('it-IT') + '\n' +
    '🛑 Stop Loss:   $' + lv.sl.toLocaleString('it-IT') + '  (-' + lv.slPct + '% / -€' + lv.slEur + ')\n' +
    '🎯 Take Profit: $' + lv.tp.toLocaleString('it-IT') + '  (+' + lv.tpPct + '% / +€' + lv.tpEur + ')\n' +
    '⚖️ R:R → 3 : 1\n' +
    '💼 Margine: €' + MARGIN + ' | Ordine: €' + ORDER_EUR + '\n' +
    '━━━━━━━━━━━━━━━━━━\n' +
    '⚠️ Non è consulenza finanziaria.';
}

function buildCloseMessage(pos, result, closePrice, pnlEur) {
  const emoji = result === 'WIN' ? '✅' : '❌';
  const pnlStr = pnlEur >= 0 ? '+€' + pnlEur.toFixed(2) : '-€' + Math.abs(pnlEur).toFixed(2);
  return emoji + ' <b>POSIZIONE CHIUSA — ' + pos.asset + '/USDT</b>\n' +
    '━━━━━━━━━━━━━━━━━━\n' +
    '📊 Direzione: ' + pos.direction + '\n' +
    '💰 Ingresso:  $' + pos.entry.toLocaleString('it-IT') + '\n' +
    '🏁 Uscita:    $' + closePrice.toLocaleString('it-IT') + '\n' +
    (result === 'WIN' ? '🎯 Take Profit raggiunto' : '🛑 Stop Loss raggiunto') + '\n' +
    '💶 P&L: <b>' + pnlStr + '</b>\n' +
    '━━━━━━━━━━━━━━━━━━';
}

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

function getFiltered(type) {
  const now = new Date();
  const from = new Date();
  if (type === 'day') from.setHours(0, 0, 0, 0);
  else if (type === 'week') from.setDate(now.getDate() - 7);
  else if (type === 'month') from.setMonth(now.getMonth() - 1);
  else if (type === 'year') from.setFullYear(now.getFullYear() - 1);
  return closedPositions.filter(p => new Date(p.closedAt) >= from);
}

async function checkPositions() {
  if (positions.length === 0) return;
  for (let i = positions.length - 1; i >= 0; i--) {
    const pos = positions[i];
    try {
      const price = await getPrice(pos.asset);
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
      let report = null;
      if (text === '/giorno') report = buildReport('GIORNALIERO', getFiltered('day'));
      else if (text === '/settimana') report = buildReport('SETTIMANALE', getFiltered('week'));
      else if (text === '/mese') report = buildReport('MENSILE', getFiltered('month'));
      else if (text === '/anno') report = buildReport('ANNUALE', getFiltered('year'));
      if (report) {
        console.log('Invio report:', text, 'update_id:', update.update_id);
        await sendTelegram(report);
      }
    }
  } catch (e) {
    console.error('Errore polling:', e.message);
  }
}

app.post('/webhook', async (req, res) => {
  try {
    const { asset, direction, entry } = req.body;
    if (!asset || !direction || !entry) {
      return res.status(400).json({ error: 'Parametri mancanti' });
    }
    const entryNum = parseFloat(entry);
    const dir = direction.toUpperCase();
    const lv = calcLevels(entryNum, dir);
    positions.push({ asset: asset.toUpperCase(), direction: dir, entry: entryNum, sl: lv.sl, tp: lv.tp, openedAt: new Date() });
    await sendTelegram(buildEntryMessage(asset.toUpperCase(), dir, entryNum, lv));
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
  setInterval(checkPositions, 10 * 60 * 1000);
  setInterval(pollTelegram, 3000);
});
