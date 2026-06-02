const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const MARGIN = 600.97;
const ORDER_EUR = 1201.94;

// === STORICO POSIZIONI IN MEMORIA ===
let positions = [];
let closedPositions = [];

// === CALCOLO TP / SL ===
function calcLevels(entry, direction) {
  const atrPct = 0.018;
  const slDist = entry * atrPct;
  const tpDist = slDist * 3;
  const sl = direction === 'LONG' ? +(entry - slDist).toFixed(2) : +(entry + slDist).toFixed(2);
  const tp = direction === 'LONG' ? +(entry + tpDist).toFixed(2) : +(entry - tpDist).toFixed(2);
  const slEur = +(slDist / entry * ORDER_EUR).toFixed(2);
  const tpEur = +(tpDist / entry * ORDER_EUR).toFixed(2);
  const slPct = +(slDist / entry * 100).toFixed(2);
  const tpPct = +(tpDist / entry * 100).toFixed(2);
  return { sl, tp, slEur, tpEur, slPct, tpPct };
}

// === PREZZO ATTUALE DA COINGECKO ===
async function getPrice(asset) {
  const id = asset === 'BTC' ? 'bitcoin' : 'ethereum';
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
  const data = await res.json();
  return data[id].usd;
}

// === INVIA MESSAGGIO TELEGRAM ===
async function sendTelegram(text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' })
  });
}

// === MESSAGGIO SEGNALE INGRESSO ===
function buildEntryMessage(asset, direction, entry, levels) {
  const emoji = direction === 'LONG' ? '📈' : '📉';
  const arrow = direction === 'LONG' ? '▲' : '▼';
  return `🤖 <b>SIGNAL BOT — ${asset}/USDT</b>
━━━━━━━━━━━━━━━━━━
${emoji} Direzione: ${arrow} ${direction}
💰 Ingresso:    $${entry.toLocaleString('it-IT')}
🛑 Stop Loss:   $${levels.sl.toLocaleString('it-IT')}  (-${levels.slPct}% / -€${levels.slEur})
🎯 Take Profit: $${levels.tp.toLocaleString('it-IT')}  (+${levels.tpPct}% / +€${levels.tpEur})
⚖️ R:R → 3 : 1
💼 Margine: €${MARGIN} | Ordine: €${ORDER_EUR}
━━━━━━━━━━━━━━━━━━
⚠️ Non è consulenza finanziaria.`;
}

// === MESSAGGIO CHIUSURA POSIZIONE ===
function buildCloseMessage(pos, result, closePrice, pnlEur) {
  const emoji = result === 'WIN' ? '✅' : '❌';
  const pnlStr = pnlEur >= 0 ? `+€${pnlEur.toFixed(2)}` : `-€${Math.abs(pnlEur).toFixed(2)}`;
  return `${emoji} <b>POSIZIONE CHIUSA — ${pos.asset}/USDT</b>
━━━━━━━━━━━━━━━━━━
📊 Direzione: ${pos.direction}
💰 Ingresso:  $${pos.entry.toLocaleString('it-IT')}
🏁 Uscita:    $${closePrice.toLocaleString('it-IT')}
${result === 'WIN' ? '🎯 Take Profit raggiunto' : '🛑 Stop Loss raggiunto'}
💶 P&L: <b>${pnlStr}</b>
━━━━━━━━━━━━━━━━━━`;
}

// === RESOCONTO PERIODICO ===
function buildReport(label, filtered) {
  const wins = filtered.filter(p => p.result === 'WIN').length;
  const losses = filtered.filter(p => p.result === 'LOSS').length;
  const totalPnl = filtered.reduce((a, p) => a + p.pnlEur, 0);
  const grossWin = filtered.filter(p => p.result === 'WIN').reduce((a, p) => a + p.pnlEur, 0);
  const grossLoss = filtered.filter(p => p.result === 'LOSS').reduce((a, p) => a + p.pnlEur, 0);
  const winRate = filtered.length > 0 ? ((wins / filtered.length) * 100).toFixed(1) : '0.0';
  const pf = grossLoss !== 0 ? (grossWin / Math.abs(grossLoss)).toFixed(2) : '∞';
  const pnlStr = totalPnl >= 0 ? `+€${totalPnl.toFixed(2)}` : `-€${Math.abs(totalPnl).toFixed(2)}`;

  if (filtered.length === 0) {
    return `📊 <b>RESOCONTO ${label}</b>\n━━━━━━━━━━━━━━━━━━\nNessuna posizione chiusa nel periodo.`;
  }

  return `📊 <b>RESOCONTO ${label}</b>
━━━━━━━━━━━━━━━━━━
📈 Trade totali: ${filtered.length}
✅ Win: ${wins}  |  ❌ Loss: ${losses}
🎯 Win Rate: ${winRate}%
💶 P&L Totale: <b>${pnlStr}</b>
📈 Profitto lordo: +€${grossWin.toFixed(2)}
📉 Perdita lorda: -€${Math.abs(grossLoss).toFixed(2)}
⚖️ Profit Factor: ${pf}
━━━━━━━━━━━━━━━━━━`;
}

// === CONTROLLA POSIZIONI APERTE OGNI 5 MIN ===
async function checkPositions() {
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

        const closed = { ...pos, result, closePrice, pnlEur, closedAt: new Date() };
        closedPositions.push(closed);
        positions.splice(i, 1);

        await sendTelegram(buildCloseMessage(pos, result, closePrice, pnlEur));
      }
    } catch (err) {
      console.error(`Errore check posizione ${pos.asset}:`, err.message);
    }
  }
}

// === RESOCONTO GIORNALIERO (ogni giorno alle 20:00) ===
function scheduleDaily() {
  const now = new Date();
  const next = new Date();
  next.setHours(20, 0, 0, 0);
  if (now >= next) next.setDate(next.getDate() + 1);
  const delay = next - now;

  setTimeout(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filtered = closedPositions.filter(p => new Date(p.closedAt) >= today);
    await sendTelegram(buildReport('GIORNALIERO', filtered));
    scheduleDaily();
  }, delay);
}

// === RESOCONTO SETTIMANALE (ogni lunedì alle 09:00) ===
function scheduleWeekly() {
  const now = new Date();
  const next = new Date();
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  next.setDate(now.getDate() + daysUntilMonday);
  next.setHours(9, 0, 0, 0);
  const delay = next - now;

  setTimeout(async () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const filtered = closedPositions.filter(p => new Date(p.closedAt) >= weekAgo);
    await sendTelegram(buildReport('SETTIMANALE', filtered));
    scheduleWeekly();
  }, delay);
}

// === RESOCONTO MENSILE (primo del mese alle 09:00) ===
function scheduleMonthly() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0);
  const delay = next - now;

  setTimeout(async () => {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const filtered = closedPositions.filter(p => new Date(p.closedAt) >= monthAgo);
    await sendTelegram(buildReport('MENSILE', filtered));
    scheduleMonthly();
  }, delay);
}

// === RESOCONTO ANNUALE (1 gennaio alle 09:00) ===
function scheduleYearly() {
  const now = new Date();
  const next = new Date(now.getFullYear() + 1, 0, 1, 9, 0, 0);
  const delay = next - now;

  setTimeout(async () => {
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const filtered = closedPositions.filter(p => new Date(p.closedAt) >= yearAgo);
    await sendTelegram(buildReport('ANNUALE', filtered));
    scheduleYearly();
  }, delay);
}

// === WEBHOOK SEGNALE IN INGRESSO ===
app.post('/webhook', async (req, res) => {
  try {
    const { asset, direction, entry } = req.body;
    if (!asset || !direction || !entry) {
      return res.status(400).json({ error: 'Parametri mancanti: asset, direction, entry' });
    }

    const entryNum = parseFloat(entry);
    const dir = direction.toUpperCase();
    const levels = calcLevels(entryNum, dir);

    positions.push({
      asset: asset.toUpperCase(),
      direction: dir,
      entry: entryNum,
      sl: levels.sl,
      tp: levels.tp,
      openedAt: new Date()
    });

    await sendTelegram(buildEntryMessage(asset.toUpperCase(), dir, entryNum, levels));
    res.json({ ok: true });
  } catch (err) {
    console.error('Errore webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

// === HEALTH CHECK ===
app.get('/', (req, res) => res.send('Bot attivo ✅'));

// === AVVIO ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
  setInterval(checkPositions, 5 * 60 * 1000);
  scheduleDaily();
  scheduleWeekly();
  scheduleMonthly();
  scheduleYearly();
});
