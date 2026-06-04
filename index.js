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
    '🏁 Uscita:    $' + closePrice.toLocaleString('it-IT') + '\n'
