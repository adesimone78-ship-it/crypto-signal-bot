const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// === CONFIGURAZIONE ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const MARGIN = 600.97;
const ORDER_EUR = 1201.94;

// === CALCOLO TP / SL ===
function calcLevels(entry, direction) {
  const atrPct = 0.018; // 1.8% ATR medio su 4H BTC/ETH
  const slDist = entry * atrPct;
  const tpDist = slDist * 3;

  const sl = direction === 'LONG'
    ? +(entry - slDist).toFixed(2)
    : +(entry + slDist).toFixed(2);

  const tp = direction === 'LONG'
    ? +(entry + tpDist).toFixed(2)
    : +(entry - tpDist).toFixed(2);

  const slEur = +(slDist / entry * ORDER_EUR).toFixed(2);
  const tpEur = +(tpDist / entry * ORDER_EUR).toFixed(2);
  const slPct = +(slDist / entry * 100).toFixed(2);
  const tpPct = +(tpDist / entry * 100).toFixed(2);

  return { sl, tp, slEur, tpEur, slPct, tpPct };
}

// === FORMATTA MESSAGGIO TELEGRAM ===
function buildMessage(asset, direction, entry, levels) {
  const emoji = direction === 'LONG' ? '📈' : '📉';
  const arrow = direction === 'LONG' ? '▲' : '▼';
  return `🤖 SIGNAL BOT — ${asset}/USDT
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

// === ENDPOINT WEBHOOK ===
app.post('/webhook', async (req, res) => {
  try {
    const { asset, direction, entry } = req.body;

    if (!asset || !direction || !entry) {
      return res.status(400).json({ error: 'Parametri mancanti: asset, direction, entry' });
    }

    const entryNum = parseFloat(entry);
    const levels = calcLevels(entryNum, direction.toUpperCase());
    const message = buildMessage(asset.toUpperCase(), direction.toUpperCase(), entryNum, levels);

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message })
    });

    const result = await response.json();
    console.log('Messaggio inviato:', result);
    res.json({ ok: true, result });

  } catch (err) {
    console.error('Errore:', err);
    res.status(500).json({ error: err.message });
  }
});

// === HEALTH CHECK ===
app.get('/', (req, res) => {
  res.send('Bot attivo ✅');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server in ascolto sulla porta ${PORT}`));
