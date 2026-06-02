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
let startedAt = Date.now();

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
    await fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML' })
    });
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
  const wins = filtered.filter(function(p) { return p.result === 'WIN'; }).length;
  const losses = filtered.filter(function(p) { return p.result === 'LOSS'; }).length;
  const totalPnl = filtered.reduce(function(a, p) { return a + p.pnlEur; }, 0);
  const grossWin = filtered.filter(function(p) { return p.result === 'WIN'; }).reduce(function(a, p) { return a + p.pnlEur; }, 0);
  const grossLoss = filtered.filter(function(p) { return p.result === 'LOSS'; }).reduce(function(a, p) { return a + p.pnlEur; }, 0);
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

async function checkPositions() {
  for (var i = positions.length - 1; i >= 0; i--) {
    var pos = positions[i];
    try {
      var price = await getPrice(pos.asset);
      var result = null;
      var closePrice = price;
      if (pos.direction === 'LONG') {
        if (price >= pos.tp) { result = 'WIN'; closePrice = pos.tp; }
        else if (price <= pos.sl) { result = 'LOSS'; closePrice = pos.sl; }
      } else {
        if (price <= pos.tp) { result = 'WIN'; closePrice = pos.tp; }
        else if (price >= pos.sl) { result = 'LOSS'; closePrice = pos.sl; }
      }
      if (result) {
        var priceDiff = result === 'WIN'
          ? (pos.direction === 'LONG' ? pos.tp - pos.entry : pos.entry - pos.tp)
          : (pos.direction === 'LONG' ? pos.sl - pos.entry : pos.entry - pos.sl);
        var pnlEur = +(priceDiff / pos.entry * ORDER_EUR).toFixed(2);
        var closed = Object.assign({}, pos, { result: result, closePrice: closePrice, pnlEur: pnlEur, closedAt: new Date() });
        closedPositions.push(closed);
        positions.splice(i, 1);
        await sendTelegram(buildCloseMessage(pos, result, closePrice, pnlEur));
      }
    } catch (e) {
      console.error('Errore check:', e.message);
    }
  }
}

function getFiltered(type) {
  var now = new Date();
  var from = new Date();
  if (type === 'day') { from.setHours(0, 0, 0, 0); }
  else if (type === 'week') { from.setDate(now.getDate() - 7); }
  else if (type === 'month') { from.setMonth(now.getMonth() - 1); }
  else if (type === 'year') { from.setFullYear(now.getFullYear() - 1); }
  return closedPositions.filter(function(p) { return new Date(p.closedAt) >= from; });
}

function msUntil(h, m, daysAhead) {
  var now = new Date();
  var target = new Date();
  target.setDate(now.getDate() + (daysAhead || 0));
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target - now;
}

function scheduleDaily() {
  setTimeout(function() {
    sendTelegram(buildReport('GIORNALIERO', getFiltered('day')));
    scheduleDaily();
  }, msUntil(20, 0));
}

function scheduleWeekly() {
  var now = new Date();
  var daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  setTimeout(function() {
    sendTelegram(buildReport('SETTIMANALE', getFiltered('week')));
    scheduleWeekly();
  }, msUntil(9, 0, daysUntilMonday - 1));
}

function scheduleMonthly() {
  var now = new Date();
  var next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0);
  setTimeout(function() {
    sendTelegram(buildReport('MENSILE', getFiltered('month')));
    scheduleMonthly();
  }, next - now);
}

function scheduleYearly() {
  var now = new Date();
  var next = new Date(now.getFullYear() + 1, 0, 1, 9, 0, 0);
  setTimeout(function() {
    sendTelegram(buildReport('ANNUALE', getFiltered('year')));
    scheduleYearly();
  }, next - now);
}

app.post('/webhook', async function(req, res) {
  try {
    var asset = req.body.asset;
    var direction = req.body.direction;
    var entry = req.body.entry;
    if (!asset || !direction || !entry) {
      return res.status(400).json({ error: 'Parametri mancanti' });
    }
    var entryNum = parseFloat(entry);
    var dir = direction.toUpperCase();
    var lv = calcLevels(entryNum, dir);
    positions.push({
      asset: asset.toUpperCase(),
      direction: dir,
      entry: entryNum,
      sl: lv.sl,
      tp: lv.tp,
      openedAt: new Date()
    });
    await sendTelegram(buildEntryMessage(asset.toUpperCase(), dir, entryNum, lv));
    res.json({ ok: true });
  } catch (e) {
    console.error('Errore webhook:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/', function(req, res) {
  res.send('Bot attivo ✅');
});

app.get('/test', async function(req, res) {
  try {
    var result = await sendTelegram('🔧 Test connessione bot — tutto ok!');
    res.json({ ok: true, token: TELEGRAM_TOKEN ? 'presente' : 'MANCANTE', chatId: CHAT_ID });
  } catch(e) {
    res.json({ ok: false, error: e.message });
  }
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('Server in ascolto sulla porta ' + PORT);
  setInterval(checkPositions, 5 * 60 * 1000);
  scheduleDaily();
  scheduleWeekly();
  scheduleMonthly();
  scheduleYearly();
});
