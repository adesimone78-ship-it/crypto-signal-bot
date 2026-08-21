const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TWELVE_KEY = process.env.TWELVE_KEY || 'demo';
const FINNHUB_KEY = process.env.FINNHUB_KEY || '';
const MARGIN_DEFAULT = 274.10;
const ORDER_DEFAULT = 548.20;

// === FILTRO TREND EMA 150/250 ===
// true  = i segnali contro-trend vengono bloccati ma tracciati in ombra
// false = tutti i segnali passano (il filtro non blocca nulla)
const TREND_FILTER_ENABLED = true;

const marginMap = {
  BTC:                           { margin: 274.10,   order: 548.20    },
  'CMCMARKETS:BTCUSD':           { margin: 268.94,   order: 537.87    },
  ETH:                           { margin: 381.94,   order: 763.88    },
  'CMCMARKETS:ETHUSD':           { margin: 36.12,    order: 72.25     },
  SOL:                           { margin: 274.10,   order: 548.20    },
  XAU:                           { margin: 970.97,   order: 19419.43  },
  'CMCMARKETS:GOLD':             { margin: 970.97,   order: 19419.43  },
  'CMCMARKETS:GOLDQ2026':        { margin: 970.97,   order: 19419.43  },
  XAGUSD:                        { margin: 1594.81,  order: 15948.15  },
  'CMCMARKETS:SILVER':           { margin: 1594.81,  order: 15948.15  },
  'CMCMARKETS:SILVERU2026':      { margin: 1594.81,  order: 15948.15  },
  'CMCMARKETS:SILVERN2026':      { margin: 1594.81,  order: 15948.15  },
  SILVERN2026:                   { margin: 1594.81,  order: 15948.15  },
  USOIL:                         { margin: 400.28,   order: 4002.80   },
  'EASYMARKETS:OILUSD':          { margin: 399.86,   order: 3998.59   },
  'FOREXCOM:NAS100':             { margin: 1294.68,  order: 25893.55  },
  US100:                         { margin: 1294.68,  order: 25893.55  },
  NAS100:                        { margin: 1294.68,  order: 25893.55  },
  'PEPPERSTONE:US500':           { margin: 330.50,   order: 6610.03   },
  US500:                         { margin: 330.50,   order: 6610.03   },
  'NASDAQ:TSLA':                 { margin: 612.36,   order: 3061.80   },
  TSLA:                          { margin: 612.36,   order: 3061.80   },
  'NASDAQ:NVDA':                 { margin: 607.92,   order: 3039.60   },
  NVDA:                          { margin: 607.92,   order: 3039.60   },
};

const atrMap = {
  BTC: 0.018, 'CMCMARKETS:BTCUSD': 0.018,
  ETH: 0.018, 'CMCMARKETS:ETHUSD': 0.018,
  SOL: 0.022,
  XAU: 0.004, 'CMCMARKETS:GOLD': 0.004, 'CMCMARKETS:GOLDQ2026': 0.004,
  XAGUSD: 0.006, 'CMCMARKETS:SILVER': 0.006, 'CMCMARKETS:SILVERU2026': 0.006,
  SILVERN2026: 0.006, 'CMCMARKETS:SILVERN2026': 0.006,
  NAS100: 0.0035, US100: 0.0035, 'FOREXCOM:NAS100': 0.0035,
  'PEPPERSTONE:US500': 0.0035, US500: 0.0035,
  USOIL: 0.008, 'EASYMARKETS:OILUSD': 0.008,
  'NASDAQ:TSLA': 0.015, TSLA: 0.015,
  DEFAULT: 0.018
};

// SL minimo garantito per asset
const minSlMap = {
  BTC: 0.020, 'CMCMARKETS:BTCUSD': 0.020,
  ETH: 0.020, 'CMCMARKETS:ETHUSD': 0.020,
  SOL: 0.025,
  XAU: 0.006, 'CMCMARKETS:GOLD': 0.006, 'CMCMARKETS:GOLDQ2026': 0.006,
  XAGUSD: 0.012, 'CMCMARKETS:SILVER': 0.012, 'CMCMARKETS:SILVERU2026': 0.012,
  SILVERN2026: 0.012, 'CMCMARKETS:SILVERN2026': 0.012,
  USOIL: 0.015, 'EASYMARKETS:OILUSD': 0.015,
  NAS100: 0.008, US100: 0.008, 'FOREXCOM:NAS100': 0.008,
  'PEPPERSTONE:US500': 0.008, US500: 0.008,
  'NASDAQ:TSLA': 0.020, TSLA: 0.020,
  'NASDAQ:NVDA': 0.020, NVDA: 0.020,
  DEFAULT: 0.010
};

const roundMap = {
  BTC: 10, 'CMCMARKETS:BTCUSD': 10,
  ETH: 1, 'CMCMARKETS:ETHUSD': 1,
  XAU: 1, 'CMCMARKETS:GOLD': 1, 'CMCMARKETS:GOLDQ2026': 1,
  XAGUSD: 0.1, 'CMCMARKETS:SILVER': 0.1, 'CMCMARKETS:SILVERU2026': 0.1,
  SILVERN2026: 0.1, 'CMCMARKETS:SILVERN2026': 0.1,
  USOIL: 0.1, 'EASYMARKETS:OILUSD': 0.1,
  NAS100: 10, US100: 10, 'FOREXCOM:NAS100': 10,
  'PEPPERSTONE:US500': 1, US500: 1,
  'NASDAQ:TSLA': 0.5, TSLA: 0.5,
  'NASDAQ:NVDA': 0.5, NVDA: 0.5,
  DEFAULT: 0.01
};

function roundPrice(price, asset) {
  const tick = roundMap[asset] || roundMap.DEFAULT;
  return Math.round(price / tick) * tick;
}

let positions = [];        // posizioni reali (notificate su Telegram)
let shadowPositions = [];  // segnali filtrati, tracciati in silenzio
let closedPositions = [];
let lastUpdateId = 0;
let processedIds = new Set();
let lastReportDay = -1;
let lastReportWeek = -1;
let lastReportMonth = -1;
let priceCache = {};       // cache prezzi per ridurre le chiamate API

// Proxy ETF per asset non coperti dalle API gratuite (futures/indici)
const proxyMap = {
  XAU: 'GLD', 'CMCMARKETS:GOLD': 'GLD', 'CMCMARKETS:GOLDQ2026': 'GLD',
  XAGUSD: 'SLV', 'CMCMARKETS:SILVER': 'SLV',
  'CMCMARKETS:SILVERU2026': 'SLV', 'CMCMARKETS:SILVERN2026': 'SLV',
  SILVERN2026: 'SLV',
  USOIL: 'USO', 'EASYMARKETS:OILUSD': 'USO',
  NAS100: 'QQQ', US100: 'QQQ', 'FOREXCOM:NAS100': 'QQQ',
  'PEPPERSTONE:US500': 'SPY', US500: 'SPY'
};

// Legge il prezzo di un ETF da Finnhub (cache 5 minuti)
async function getFinnhubPrice(symbol) {
  const cached = priceCache['FH_' + symbol];
  if (cached && (Date.now() - cached.at) < 300000) return cached.price;

  try {
    const res = await fetch('https://finnhub.io/api/v1/quote?symbol=' +
      symbol + '&token=' + FINNHUB_KEY);
    const data = await res.json();
    if (data && data.c && data.c > 0) {
      priceCache['FH_' + symbol] = { price: data.c, at: Date.now() };
      return data.c;
    }
    console.warn('Finnhub risposta non valida per', symbol + ':', JSON.stringify(data));
  } catch (e) {
    console.error('Errore Finnhub per', symbol + ':', e.message);
  }
  return null;
}

// === SUPABASE ===
async function dbInsertTrade(pos, lv, isFiltered) {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/trades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        asset: pos.asset,
        direction: pos.direction,
        entry: pos.entry,
        sl: pos.sl,
        tp: pos.tp,
        margin: lv.margin,
        order_eur: lv.order,
        opened_at: pos.openedAt,
        filtered: isFiltered === true,
        proxy_ratio: pos.proxyRatio || null
      })
    });
    const data = await res.json();
    if (data && data[0]) {
      console.log((isFiltered ? 'Trade OMBRA' : 'Trade') + ' salvato su Supabase, id:', data[0].id);
      return data[0].id;
    }
  } catch (e) {
    console.error('Errore Supabase insert:', e.message);
  }
  return null;
}

async function dbCloseTrade(dbId, closePrice, result, pnlEur) {
  if (!dbId) return;
  try {
    await fetch(SUPABASE_URL + '/rest/v1/trades?id=eq.' + dbId, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      },
      body: JSON.stringify({
        closed_at: new Date().toISOString(),
        close_price: closePrice,
        result: result,
        pnl_eur: pnlEur
      })
    });
    console.log('Trade chiuso su Supabase, id:', dbId, '->', result);
  } catch (e) {
    console.error('Errore Supabase update:', e.message);
  }
}

async function dbGetStats() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/trades?select=*&order=opened_at.desc', {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    });
    return await res.json();
  } catch (e) {
    console.error('Errore Supabase stats:', e.message);
    return [];
  }
}

async function pingSupabase() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/trades?select=id&limit=1', {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    });
    if (res.ok) console.log('Supabase ping ok');
    else console.warn('Supabase ping fallito, status:', res.status);
  } catch (e) {
    console.error('Errore ping Supabase:', e.message);
  }
}

// Ricarica le posizioni ancora aperte da Supabase dopo un riavvio
async function reloadOpenPositions() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/trades?result=is.null&order=opened_at.asc', {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    });
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log('Nessuna posizione aperta da ricaricare');
      return;
    }

    let reali = 0, ombra = 0;
    for (const r of rows) {
      const pos = {
        asset: r.asset,
        direction: r.direction,
        entry: parseFloat(r.entry),
        sl: parseFloat(r.sl),
        tp: parseFloat(r.tp),
        openedAt: new Date(r.opened_at),
        dbId: r.id,
        proxyRatio: r.proxy_ratio ? parseFloat(r.proxy_ratio) : null
      };
      if (r.filtered === true) { shadowPositions.push(pos); ombra++; }
      else { positions.push(pos); reali++; }
    }
    console.log('Posizioni ricaricate da Supabase — reali:', reali, '| ombra:', ombra);
  } catch (e) {
    console.error('Errore reloadOpenPositions:', e.message);
  }
}

// Win rate calcolato SOLO sui trade reali (filtered = false)
async function getWinRates(asset) {
  try {
    const trades = await dbGetStats();
    if (!Array.isArray(trades)) return null;
    const closed = trades.filter(t =>
      t.result !== null && t.result !== undefined && t.filtered !== true
    );
    if (closed.length === 0) return null;

    const globalWins = closed.filter(t => t.result === 'WIN').length;
    const globalRate = ((globalWins / closed.length) * 100).toFixed(1);

    const assetTrades = closed.filter(t => t.asset === asset);
    let assetRate = null;
    if (assetTrades.length > 0) {
      const assetWins = assetTrades.filter(t => t.result === 'WIN').length;
      assetRate = ((assetWins / assetTrades.length) * 100).toFixed(1);
    }

    return { globalRate, globalCount: closed.length, assetRate, assetCount: assetTrades.length };
  } catch (e) {
    console.error('Errore getWinRates:', e.message);
    return null;
  }
}

function getAssetSuffix(asset) {
  const fiat = [
    'XAU', 'XAGUSD', 'NAS100', 'US100', 'USOIL', 'EURUSD', 'GBPUSD',
    'FOREXCOM:NAS100', 'EASYMARKETS:OILUSD',
    'CMCMARKETS:GOLD', 'CMCMARKETS:GOLDQ2026',
    'CMCMARKETS:SILVER', 'CMCMARKETS:SILVERU2026',
    'CMCMARKETS:SILVERN2026', 'SILVERN2026',
    'PEPPERSTONE:US500', 'US500'
  ];
  if (fiat.includes(asset)) return 'USD';
  if (asset === 'NASDAQ:TSLA' || asset === 'TSLA') return 'USD';
  if (asset === 'NASDAQ:NVDA' || asset === 'NVDA') return 'USD';
  return 'USDT';
}

function nowIT() {
  return new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtAsset(n, asset) {
  const tick = roundMap[asset] || roundMap.DEFAULT;
  const decimals = tick < 1 ? (tick.toString().split('.')[1] || '').length : 0;
  return n.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function calcLevels(entry, direction, asset, slOverride, tpOverride) {
  const { margin, order } = marginMap[asset] || { margin: MARGIN_DEFAULT, order: ORDER_DEFAULT };
  let sl, tp;
  let slAdjusted = false;
  const slNum = slOverride !== undefined && slOverride !== null ? parseFloat(slOverride) : null;
  const tpNum = tpOverride !== undefined && tpOverride !== null ? parseFloat(tpOverride) : null;

  if (slNum !== null && !isNaN(slNum) && slNum > 0) {
    sl = roundPrice(slNum, asset);
    if (tpNum !== null && !isNaN(tpNum) && tpNum > 0) {
      tp = roundPrice(tpNum, asset);
    } else {
      const slDist = Math.abs(entry - sl);
      tp = sl > entry ? roundPrice(entry - slDist * 3, asset) : roundPrice(entry + slDist * 3, asset);
      console.log('TP calcolato da SL dinamico:', sl, '-> TP:', tp, 'asset:', asset);
    }
  } else {
    const atrPct = atrMap[asset] || atrMap.DEFAULT;
    const slDist = entry * atrPct;
    const tpDist = slDist * 3;
    sl = direction === 'LONG' ? roundPrice(entry - slDist, asset) : roundPrice(entry + slDist, asset);
    tp = direction === 'LONG' ? roundPrice(entry + tpDist, asset) : roundPrice(entry - tpDist, asset);
  }

  const correctedDirection = sl > entry ? 'SHORT' : 'LONG';

  // SL minimo garantito
  const minSlPct = minSlMap[asset] || minSlMap.DEFAULT;
  const minSlDist = entry * minSlPct;
  const currentSlDist = Math.abs(entry - sl);

  if (currentSlDist < minSlDist) {
    const oldSl = sl;
    sl = correctedDirection === 'LONG'
      ? roundPrice(entry - minSlDist, asset)
      : roundPrice(entry + minSlDist, asset);
    const newSlDist = Math.abs(entry - sl);
    tp = correctedDirection === 'LONG'
      ? roundPrice(entry + newSlDist * 3, asset)
      : roundPrice(entry - newSlDist * 3, asset);
    slAdjusted = true;
    console.log('SL allargato al minimo:', oldSl, '->', sl,
      '(min ' + (minSlPct * 100).toFixed(2) + '%) | nuovo TP:', tp, '| asset:', asset);
  }

  const slDistFinal = Math.abs(entry - sl);
  const tpDistFinal = Math.abs(tp - entry);

  return {
    sl, tp, margin, order, correctedDirection, slAdjusted,
    slEur: +(slDistFinal / entry * order).toFixed(2),
    tpEur: +(tpDistFinal / entry * order).toFixed(2),
    slPct: +(slDistFinal / entry * 100).toFixed(2),
    tpPct: +(tpDistFinal / entry * 100).toFixed(2)
  };
}

async function getPrice(asset) {
  try {
    const cryptoMap = {
      BTC: 'BTCUSDT', 'CMCMARKETS:BTCUSD': 'BTCUSDT',
      ETH: 'ETHUSDT', 'CMCMARKETS:ETHUSD': 'ETHUSDT',
      SOL: 'SOLUSDT', BNB: 'BNBUSDT', XRP: 'XRPUSDT'
    };
    if (cryptoMap[asset]) {
      const binanceSymbol = cryptoMap[asset];
      const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=' + binanceSymbol);
      const data = await res.json();
      if (data && data.price) return parseFloat(data.price);
      console.warn('Binance risposta vuota per:', binanceSymbol);
      return null;
    }

    // Proxy ETF via Finnhub — per futures e indici non coperti altrove
    if (proxyMap[asset] && FINNHUB_KEY) {
      const proxySymbol = proxyMap[asset];
      const proxyPrice = await getFinnhubPrice(proxySymbol);
      if (proxyPrice !== null) {
        const pos = positions.find(p => p.asset === asset) ||
                    shadowPositions.find(p => p.asset === asset);
        if (pos && pos.proxyRatio) {
          const stimato = proxyPrice * pos.proxyRatio;
          return roundPrice(stimato, asset);
        }
        console.warn('Proxy senza ratio per', asset, '— provo Yahoo');
      }
    }

    // Twelve Data — solo azioni USA (il piano free non copre commodity e indici)
    const twelveMap = {
      'NASDAQ:TSLA': 'TSLA', TSLA: 'TSLA',
      'NASDAQ:NVDA': 'NVDA', NVDA: 'NVDA'
    };

    if (twelveMap[asset]) {
      const symbol = twelveMap[asset];
      const cached = priceCache[symbol];
      if (cached && (Date.now() - cached.at) < 600000) {
        return cached.price;
      }

      try {
        const res = await fetch('https://api.twelvedata.com/price?symbol=' +
          encodeURIComponent(symbol) + '&apikey=' + TWELVE_KEY);
        const data = await res.json();
        if (data && data.price) {
          const price = parseFloat(data.price);
          priceCache[symbol] = { price, at: Date.now() };
          return price;
        }
        console.warn('Twelve Data per', symbol + ':', JSON.stringify(data), '— provo Yahoo');
      } catch(e) {
        console.warn('Twelve Data errore per:', symbol, e.message, '— provo Yahoo');
      }
    }

    const yahooMap = {
      XAU: 'GC=F',
      'CMCMARKETS:GOLD': 'GC=F', 'CMCMARKETS:GOLDQ2026': 'GC=F',
      XAGUSD: 'SI=F',
      'CMCMARKETS:SILVER': 'SI=F', 'CMCMARKETS:SILVERU2026': 'SI=F',
      SILVERN2026: 'SI=F', 'CMCMARKETS:SILVERN2026': 'SI=F',
      NAS100: 'NQ=F', US100: 'NQ=F', 'FOREXCOM:NAS100': 'NQ=F',
      'PEPPERSTONE:US500': 'ES=F', US500: 'ES=F',
      USOIL: 'CL=F', 'EASYMARKETS:OILUSD': 'CL=F',
      'NASDAQ:TSLA': 'TSLA', TSLA: 'TSLA',
      'NASDAQ:NVDA': 'NVDA', NVDA: 'NVDA'
    };
    if (yahooMap[asset]) {
      const symbol = yahooMap[asset];
      const cached = priceCache[symbol];
      if (cached && (Date.now() - cached.at) < 600000) {
        return cached.price;
      }

      try {
        const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/' + symbol + '?interval=1m&range=1d', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            'Accept': 'application/json'
          }
        });
        const text = await res.text();
        if (!text.includes('Too Many Requests')) {
          const data = JSON.parse(text);
          const price = data.chart.result[0].meta.regularMarketPrice;
          priceCache[symbol] = { price, at: Date.now() };
          return price;
        }
        console.warn('Yahoo rate limit per:', symbol);
      } catch(e) {
        console.warn('Yahoo errore per:', symbol, e.message);
      }

      if (cached && (Date.now() - cached.at) < 3600000) {
        console.log('Uso prezzo in cache per', symbol + ':', cached.price);
        return cached.price;
      }

      return null;
    }
    return null;
  } catch (e) {
    console.error('Errore getPrice:', asset, e.message);
    return null;
  }
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

function buildEntryMessage(asset, direction, entry, lv, stats, trendValue) {
  const isLong = direction === 'LONG';
  const emoji = isLong ? '📈' : '📉';
  const arrow = isLong ? '▲' : '▼';
  const suffix = getAssetSuffix(asset);
  const fmt = (n) => fmtAsset(n, asset);
  const shortName = asset.split(':').pop();

  let statsBlock = '';
  if (stats) {
    statsBlock = '📊 <b>PERFORMANCE BOT</b>\n';
    statsBlock += '🌍 Globale: <b>' + stats.globalRate + '%</b> win (' + stats.globalCount + ' trade)\n';
    if (stats.assetRate !== null) {
      statsBlock += '🎯 ' + shortName + ': <b>' + stats.assetRate + '%</b> win (' + stats.assetCount + ' trade)\n';
    } else {
      statsBlock += '🎯 ' + shortName + ': primo trade su questo asset\n';
    }
    statsBlock += '━━━━━━━━━━━━━━━━━━\n';
  }

  const slNote = lv.slAdjusted ? '  ⚙️' : '';    
  
  const trendLine = (trendValue !== null && !isNaN(trendValue) && trendValue !== 0)
    ? '📐 EMA Trend: ' + (trendValue > 0 ? 'RIALZISTA ✅' : 'RIBASSISTA ✅') + '\n'
    : '';

  return statsBlock +
    '🤖 <b>SIGNAL BOT — ' + asset + '/' + suffix + '</b>\n' +
    '━━━━━━━━━━━━━━━━━━\n' +
    emoji + ' Direzione: ' + arrow + ' ' + direction + '\n' +
    '🕐 Orario: ' + nowIT() + '\n' +
    '💰 Ingresso:    $' + fmt(entry) + '\n' +
    '🛑 Stop Loss:   $' + fmt(lv.sl) + '  (-' + lv.slPct + '% / -€' + lv.slEur + ')' + slNote + '\n' +
    '🎯 Take Profit: $' + fmt(lv.tp) + '  (+' + lv.tpPct + '% / +€' + lv.tpEur + ')\n' +
    '⚖️ R:R → 3 : 1\n' +
    trendLine +
    '💼 Margine: €' + lv.margin.toLocaleString('it-IT') + ' | Ordine: €' + lv.order.toLocaleString('it-IT') + '\n' +
    (lv.slAdjusted ? '⚙️ SL allargato al minimo di sicurezza\n' : '') +
    '━━━━━━━━━━━━━━━━━━\n' +
    '⚠️ Non è consulenza finanziaria.';
}

function buildCloseMessage(pos, result, closePrice, pnlEur) {
  const emoji = result === 'WIN' ? '✅' : '❌';
  const pnlStr = pnlEur >= 0 ? '+€' + pnlEur.toFixed(2) : '-€' + Math.abs(pnlEur).toFixed(2);
  const suffix = getAssetSuffix(pos.asset);
  const fmt = (n) => fmtAsset(n, pos.asset);
  const duration = Math.round((new Date() - new Date(pos.openedAt)) / 60000);
  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  const durStr = hours > 0 ? hours + 'h ' + mins + 'min' : mins + 'min';
  return emoji + ' <b>POSIZIONE CHIUSA — ' + pos.asset + '/' + suffix + '</b>\n' +
    '━━━━━━━━━━━━━━━━━━\n' +
    '📊 Direzione: ' + pos.direction + '\n' +
    '💰 Ingresso:  $' + fmt(pos.entry) + '\n' +
    '🏁 Uscita:    $' + fmt(closePrice) + '\n' +
    '⏱ Durata:    ' + durStr + '\n' +
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
  const totalPnl = filtered.reduce((a, p) => a + parseFloat(p.pnl_eur || 0), 0);
  const grossWin = filtered.filter(p => p.result === 'WIN').reduce((a, p) => a + parseFloat(p.pnl_eur || 0), 0);
  const grossLoss = filtered.filter(p => p.result === 'LOSS').reduce((a, p) => a + parseFloat(p.pnl_eur || 0), 0);
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

function statBlock(list) {
  const wins = list.filter(t => t.result === 'WIN').length;
  const losses = list.filter(t => t.result === 'LOSS').length;
  const pnl = list.reduce((a, t) => a + parseFloat(t.pnl_eur || 0), 0);
  const rate = list.length > 0 ? ((wins / list.length) * 100).toFixed(1) : '0.0';
  return { wins, losses, pnl, rate, count: list.length };
}

async function buildStatsMessage(trades) {
  if (!Array.isArray(trades)) return '📊 Errore lettura database.';

  const real = trades.filter(t => t.result !== null && t.filtered !== true);
  const shadow = trades.filter(t => t.result !== null && t.filtered === true);

  if (real.length === 0 && shadow.length === 0) {
    return '📊 <b>STATISTICHE</b>\n━━━━━━━━━━━━━━━━━━\nNessun trade chiuso nel database.';
  }

  const r = statBlock(real);
  let msg = '📊 <b>STATISTICHE — TRADE REALI</b>\n━━━━━━━━━━━━━━━━━━\n';
  msg += '📈 Trade totali: ' + r.count + '\n';
  msg += '✅ Win: ' + r.wins + ' | ❌ Loss: ' + r.losses + '\n';
  msg += '🎯 Win Rate: <b>' + r.rate + '%</b>\n';
  msg += '💶 P&L Totale: <b>' + (r.pnl >= 0 ? '+' : '') + '€' + r.pnl.toFixed(2) + '</b>\n';

  if (real.length > 0) {
    const byAsset = {};
    for (const t of real) {
      if (!byAsset[t.asset]) byAsset[t.asset] = { wins: 0, losses: 0, pnl: 0 };
      if (t.result === 'WIN') byAsset[t.asset].wins++;
      else byAsset[t.asset].losses++;
      byAsset[t.asset].pnl += parseFloat(t.pnl_eur || 0);
    }
    msg += '━━━━━━━━━━━━━━━━━━\n<b>Per asset:</b>\n';
    for (const [asset, s] of Object.entries(byAsset)) {
      const tot = s.wins + s.losses;
      const wr = ((s.wins / tot) * 100).toFixed(0);
      const pnlStr = s.pnl >= 0 ? '+€' + s.pnl.toFixed(2) : '-€' + Math.abs(s.pnl).toFixed(2);
      msg += '• <b>' + asset.split(':').pop() + '</b>: ' + tot + ' trade | ' + wr + '% | ' + pnlStr + '\n';
    }
  }

  // === CONFRONTO CON I SEGNALI FILTRATI ===
  msg += '━━━━━━━━━━━━━━━━━━\n';
  msg += '🚫 <b>SEGNALI FILTRATI (ombra)</b>\n';
    msg += 'Filtro EMA Trend: ' + (TREND_FILTER_ENABLED ? 'ATTIVO' : 'DISATTIVO') + '\n';

  if (shadow.length === 0) {
    msg += 'Nessun segnale filtrato ancora concluso.\n';
  } else {
    const s = statBlock(shadow);
    msg += '📈 Filtrati conclusi: ' + s.count + '\n';
    msg += '✅ Sarebbero stati Win: ' + s.wins + ' | ❌ Loss: ' + s.losses + '\n';
    msg += '🎯 Win Rate ombra: <b>' + s.rate + '%</b>\n';
    msg += '💶 P&L evitato: <b>' + (s.pnl >= 0 ? '+' : '') + '€' + s.pnl.toFixed(2) + '</b>\n';

    msg += '━━━━━━━━━━━━━━━━━━\n';
    msg += '⚖️ <b>VERDETTO FILTRO</b>\n';
    if (s.pnl < 0) {
      msg += '✅ Il filtro ha EVITATO una perdita di €' + Math.abs(s.pnl).toFixed(2) + '\n';
    } else if (s.pnl > 0) {
      msg += '⚠️ Il filtro ha SCARTATO un profitto di €' + s.pnl.toFixed(2) + '\n';
    } else {
      msg += 'Impatto neutro finora.\n';
    }

    const all = real.concat(shadow);
    const a = statBlock(all);
    msg += '📊 Senza filtro sarebbe: ' + a.rate + '% win su ' + a.count + ' trade\n';
    msg += '📊 Con filtro attuale:   ' + r.rate + '% win su ' + r.count + ' trade\n';
    const delta = (parseFloat(r.rate) - parseFloat(a.rate)).toFixed(1);
    msg += '📐 Differenza win rate: ' + (delta >= 0 ? '+' : '') + delta + ' punti\n';

    if (s.count < 10) {
      msg += '\n⏳ Solo ' + s.count + ' trade ombra: dati ancora non significativi.\n';
    }
  }

  msg += '━━━━━━━━━━━━━━━━━━';
  return msg;
}

function buildOpenPositions() {
  const totale = positions.length + shadowPositions.length;
  if (totale === 0) {
    return '📋 <b>POSIZIONI APERTE</b>\n━━━━━━━━━━━━━━━━━━\nNessuna posizione aperta.';
  }

  let msg = '📋 <b>POSIZIONI APERTE (' + positions.length + ')</b>\n━━━━━━━━━━━━━━━━━━\n';
  if (positions.length === 0) {
    msg += 'Nessuna posizione reale aperta.\n';
  } else {
    positions.forEach((pos, i) => {
      const suffix = getAssetSuffix(pos.asset);
      const fmt = (n) => fmtAsset(n, pos.asset);
      const duration = Math.round((new Date() - new Date(pos.openedAt)) / 60000);
      const hours = Math.floor(duration / 60);
      const mins = duration % 60;
      const durStr = hours > 0 ? hours + 'h ' + mins + 'min' : mins + 'min';
      msg += (i + 1) + '. <b>' + pos.asset + '/' + suffix + '</b> ' + pos.direction + '\n';
      msg += '   💰 Entry: $' + fmt(pos.entry) + '\n';
      msg += '   🛑 SL: $' + fmt(pos.sl) + ' | 🎯 TP: $' + fmt(pos.tp) + '\n';
      msg += '   ⏱ Aperta da: ' + durStr + '\n';
      if (i < positions.length - 1) msg += '─────────────────\n';
    });
  }

  if (shadowPositions.length > 0) {
    msg += '━━━━━━━━━━━━━━━━━━\n';
    msg += '🚫 <b>OMBRA — filtrate (' + shadowPositions.length + ')</b>\n';
    shadowPositions.forEach((pos) => {
      const fmt = (n) => fmtAsset(n, pos.asset);
      const duration = Math.round((new Date() - new Date(pos.openedAt)) / 60000);
      const hours = Math.floor(duration / 60);
      const mins = duration % 60;
      const durStr = hours > 0 ? hours + 'h ' + mins + 'min' : mins + 'min';
      msg += '• ' + pos.asset.split(':').pop() + ' ' + pos.direction +
        ' @ $' + fmt(pos.entry) + ' — ' + durStr + '\n';
    });
  }

  msg += '━━━━━━━━━━━━━━━━━━';
  return msg;
}

function getFiltered(type, trades) {
  const now = new Date();
  const from = new Date();
  if (type === 'day') from.setHours(0, 0, 0, 0);
  else if (type === 'week') from.setDate(now.getDate() - 7);
  else if (type === 'month') from.setMonth(now.getMonth() - 1);
  else if (type === 'year') from.setFullYear(now.getFullYear() - 1);
  return trades.filter(p =>
    new Date(p.closed_at || p.closedAt) >= from &&
    p.result !== null &&
    p.filtered !== true
  );
}

// Valuta una singola posizione contro il prezzo corrente.
// Ritorna null se ancora aperta, altrimenti { result, closePrice, pnlEur }
function evaluatePosition(pos, price) {
  let result = null;
  let closePrice = price;

  if (pos.direction === 'LONG') {
    if (price >= pos.tp) { result = 'WIN'; closePrice = pos.tp; }
    else if (price <= pos.sl) { result = 'LOSS'; closePrice = pos.sl; }
  } else {
    if (price <= pos.tp) { result = 'WIN'; closePrice = pos.tp; }
    else if (price >= pos.sl) { result = 'LOSS'; closePrice = pos.sl; }
  }

  const ageHours = (new Date() - new Date(pos.openedAt)) / 3600000;
  const { order } = marginMap[pos.asset] || { order: ORDER_DEFAULT };

  // Timeout 7 giorni
  if (result === null && ageHours >= 168) {
    const priceDiff = pos.direction === 'LONG' ? price - pos.entry : pos.entry - price;
    const pnlEur = +(priceDiff / pos.entry * order).toFixed(2);
    return { result: pnlEur >= 0 ? 'WIN' : 'LOSS', closePrice: price, pnlEur, timeout: true };
  }

  if (result === null) return null;

  const priceDiff = result === 'WIN'
    ? (pos.direction === 'LONG' ? pos.tp - pos.entry : pos.entry - pos.tp)
    : (pos.direction === 'LONG' ? pos.sl - pos.entry : pos.entry - pos.sl);
  const pnlEur = +(priceDiff / pos.entry * order).toFixed(2);
  return { result, closePrice, pnlEur, timeout: false };
}

async function checkPositions() {
  // --- Posizioni reali ---
  for (let i = positions.length - 1; i >= 0; i--) {
    const pos = positions[i];
    try {
      const price = await getPrice(pos.asset);
      if (price === null) continue;
      const out = evaluatePosition(pos, price);
      if (!out) continue;

      await dbCloseTrade(pos.dbId, out.closePrice, out.result, out.pnlEur);
      closedPositions.push(Object.assign({}, pos, {
        result: out.result, closePrice: out.closePrice,
        pnl_eur: out.pnlEur, closedAt: new Date()
      }));
      positions.splice(i, 1);

      if (out.timeout) {
        await sendTelegram(
          '⏰ <b>POSIZIONE CHIUSA — TIMEOUT 7 GIORNI</b>\n' +
          '━━━━━━━━━━━━━━━━━━\n' +
          '📊 Asset: <b>' + pos.asset + '</b>\n' +
          '📊 Direzione: ' + pos.direction + '\n' +
          '💰 Ingresso: $' + fmtAsset(pos.entry, pos.asset) + '\n' +
          '🏁 Uscita: $' + fmtAsset(out.closePrice, pos.asset) + '\n' +
          '💶 P&L: <b>' + (out.pnlEur >= 0 ? '+' : '') + '€' + out.pnlEur.toFixed(2) + '</b>\n' +
          '━━━━━━━━━━━━━━━━━━'
        );
      } else {
        await sendTelegram(buildCloseMessage(pos, out.result, out.closePrice, out.pnlEur));
      }
    } catch (e) {
      console.error('Errore check:', e.message);
    }
  }

  // --- Posizioni ombra: stesso monitoraggio, nessuna notifica Telegram ---
  for (let i = shadowPositions.length - 1; i >= 0; i--) {
    const pos = shadowPositions[i];
    try {
      const price = await getPrice(pos.asset);
      if (price === null) continue;
      const out = evaluatePosition(pos, price);
      if (!out) continue;

      await dbCloseTrade(pos.dbId, out.closePrice, out.result, out.pnlEur);
      shadowPositions.splice(i, 1);
      console.log('OMBRA chiusa:', pos.asset, pos.direction,
        '->', out.result, 'P&L simulato:', out.pnlEur);
    } catch (e) {
      console.error('Errore check ombra:', e.message);
    }
  }
}

// === RESOCONTI AUTOMATICI ===
function checkScheduledReports() {
  const now = new Date();
  const itTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  const h = itTime.getHours();
  const m = itTime.getMinutes();
  const d = itTime.getDate();
  const dow = itTime.getDay();
  const dayOfYear = Math.floor((itTime - new Date(itTime.getFullYear(), 0, 0)) / 86400000);

  if (h === 20 && m < 2 && lastReportDay !== dayOfYear) {
    lastReportDay = dayOfYear;
    dbGetStats().then(trades => {
      sendTelegram(buildReport('GIORNALIERO', getFiltered('day', trades)));
      console.log('Resoconto giornaliero inviato');
    });
  }

  if (dow === 1 && h === 9 && m < 2 && lastReportWeek !== dayOfYear) {
    lastReportWeek = dayOfYear;
    dbGetStats().then(trades => {
      sendTelegram(buildReport('SETTIMANALE', getFiltered('week', trades)));
      console.log('Resoconto settimanale inviato');
    });
  }

  if (d === 1 && h === 9 && m < 2 && lastReportMonth !== itTime.getMonth()) {
    lastReportMonth = itTime.getMonth();
    dbGetStats().then(trades => {
      sendTelegram(buildReport('MENSILE', getFiltered('month', trades)));
      console.log('Resoconto mensile inviato');
    });
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
      let reply = null;

      if (text === '/giorno' || text === '/settimana' || text === '/mese' || text === '/anno') {
        const trades = await dbGetStats();
        const type = text === '/giorno' ? 'day' : text === '/settimana' ? 'week' : text === '/mese' ? 'month' : 'year';
        const label = text === '/giorno' ? 'GIORNALIERO' : text === '/settimana' ? 'SETTIMANALE' : text === '/mese' ? 'MENSILE' : 'ANNUALE';
        reply = buildReport(label, getFiltered(type, trades));

      } else if (text === '/aperte') {
        reply = buildOpenPositions();

      } else if (text === '/chiudi tutto') {
        positions = [];
        shadowPositions = [];
        reply = '🗑 <b>Posizioni cancellate dalla memoria (reali e ombra).</b>\nNota: i trade restano registrati su Supabase.';

      } else if (text === '/slmin') {
        let msg = '⚙️ <b>SL MINIMI CONFIGURATI</b>\n━━━━━━━━━━━━━━━━━━\n';
        const shown = new Set();
        for (const [k, v] of Object.entries(minSlMap)) {
          if (k === 'DEFAULT') continue;
          const short = k.split(':').pop();
          if (shown.has(short)) continue;
          shown.add(short);
          msg += '• ' + short + ': <b>' + (v * 100).toFixed(2) + '%</b>\n';
        }
        msg += '━━━━━━━━━━━━━━━━━━';
        reply = msg;

      } else if (text === '/prezzi') {
        let msg = '💹 <b>FONTI PREZZI</b>\n━━━━━━━━━━━━━━━━━━\n';
        msg += 'Finnhub: ' + (FINNHUB_KEY ? 'ATTIVO ✅' : 'NON configurato ❌') + '\n';
        msg += '━━━━━━━━━━━━━━━━━━\n';
        const shown = new Set();
        for (const [k, v] of Object.entries(proxyMap)) {
          const short = k.split(':').pop();
          if (shown.has(v)) continue;
          shown.add(v);
          const p = await getFinnhubPrice(v);
          msg += '• ' + v + ': ' + (p !== null ? '$' + p : 'non disponibile') + '\n';
        }
        msg += '━━━━━━━━━━━━━━━━━━\nProxy ETF per futures e indici.';
        reply = msg;

       } else if (text === '/filtro') {
        reply = '📐 <b>FILTRO EMA TREND 150/250</b>\n' +
          '━━━━━━━━━━━━━━━━━━\n' +
          'Stato: <b>' + (TREND_FILTER_ENABLED ? 'ATTIVO ✅' : 'DISATTIVO ❌') + '</b>\n' +
          'Regola: LONG solo se EMA150 > EMA250\n' +
          '        SHORT solo se EMA150 < EMA250\n' +
          'Ombra aperte ora: ' + shadowPositions.length + '\n' +
          '━━━━━━━━━━━━━━━━━━\n' +
          'I segnali filtrati vengono tracciati in silenzio.\n' +
          'Usa /stats per il confronto con e senza filtro.';

      } else if (text === '/filtrati') {
        const trades = await dbGetStats();
        const shadow = Array.isArray(trades) ? trades.filter(t => t.filtered === true) : [];
        const chiusi = shadow.filter(t => t.result !== null);
        if (shadow.length === 0) {
          reply = '🚫 <b>SEGNALI FILTRATI</b>\n━━━━━━━━━━━━━━━━━━\nNessun segnale filtrato finora.';
        } else {
          let msg = '🚫 <b>SEGNALI FILTRATI (' + shadow.length + ')</b>\n';
          msg += 'Conclusi: ' + chiusi.length + ' | Aperti: ' + (shadow.length - chiusi.length) + '\n';
          msg += '━━━━━━━━━━━━━━━━━━\n';
          shadow.slice(0, 12).forEach(t => {
            const esito = t.result === 'WIN' ? '✅ WIN' : t.result === 'LOSS' ? '❌ LOSS' : '⏳ aperto';
            const pnl = t.result !== null
              ? ' (' + (parseFloat(t.pnl_eur) >= 0 ? '+' : '') + '€' + parseFloat(t.pnl_eur).toFixed(2) + ')'
              : '';
            const ora = new Date(t.opened_at).toLocaleString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
            msg += '• ' + t.asset.split(':').pop() + ' ' + t.direction + ' — ' + esito + pnl + ' — ' + ora + '\n';
          });
          if (shadow.length > 12) msg += '... e altri ' + (shadow.length - 12) + '\n';
          msg += '━━━━━━━━━━━━━━━━━━\nUsa /stats per il verdetto sul filtro.';
          reply = msg;
        }

      } else if (text === '/testreport') {
        const now2 = new Date();
        const itTime = new Date(now2.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
        reply = '🔧 <b>TEST SCHEDULER</b>\n' +
          '━━━━━━━━━━━━━━━━━━\n' +
          'Ora server UTC: ' + now2.toISOString() + '\n' +
          'Ora italiana: ' + itTime.toLocaleString('it-IT') + '\n' +
          'Ore: ' + itTime.getHours() + ' | Minuti: ' + itTime.getMinutes() + '\n' +
          'Giorno settimana: ' + itTime.getDay() + '\n' +
          'lastReportDay: ' + lastReportDay + '\n' +
          'Posizioni reali: ' + positions.length + ' | Ombra: ' + shadowPositions.length + '\n' +
          '━━━━━━━━━━━━━━━━━━';

      } else if (text === '/stats') {
        const trades = await dbGetStats();
        reply = await buildStatsMessage(trades);
      }

      if (reply) {
        console.log('Invio risposta a:', text, 'update_id:', update.update_id);
        await sendTelegram(reply);
      }
    }
  } catch (e) {
    console.error('Errore polling:', e.message);
  }
}

app.post('/webhook', async (req, res) => {
  try {
    const { asset, direction, entry, sl, tp, trend } = req.body;
    console.log('Webhook ricevuto:', JSON.stringify(req.body));

    if (!asset || !direction || !entry) {
      console.log('Payload vuoto o incompleto — ignorato');
      return res.status(400).json({ error: 'Parametri mancanti' });
    }

    let assetUp = asset.toUpperCase();
    if (assetUp === 'US500') assetUp = 'PEPPERSTONE:US500';
    if (assetUp === 'US100') assetUp = 'FOREXCOM:NAS100';

    const dir = direction.toUpperCase();
    const entryNum = roundPrice(parseFloat(entry), assetUp);

    // Blocco doppio: controlla sia le reali che le ombra
    if (positions.find(p => p.asset === assetUp) ||
        shadowPositions.find(p => p.asset === assetUp)) {
      console.log('Segnale ignorato — posizione già aperta su:', assetUp);
      return res.json({ ok: true, skipped: true, reason: 'posizione già aperta' });
    }

    const lv = calcLevels(entryNum, dir, assetUp, sl, tp);
    const finalDir = lv.correctedDirection;

    const slRatio = lv.sl / entryNum;
    if (slRatio < 0.5 || slRatio > 1.5) {
      console.log('Segnale rifiutato — SL anomalo:', lv.sl, 'entry:', entryNum, 'asset:', assetUp);
      return res.json({ ok: false, skipped: true, reason: 'SL anomalo: ' + lv.sl });
    }

    // === FILTRO TREND EMA 150/250 ===
    // Il Pine invia 1 (rialzista) o -1 (ribassista)
    const trendValue = (trend !== undefined && trend !== null) ? parseFloat(trend) : null;
    let isFiltered = false;

    if (TREND_FILTER_ENABLED && trendValue !== null && !isNaN(trendValue) && trendValue !== 0) {
      const trendRialzista = trendValue > 0;
      const controTrend = (finalDir === 'LONG' && !trendRialzista) ||
                          (finalDir === 'SHORT' && trendRialzista);
      if (controTrend) {
        isFiltered = true;
        console.log('Segnale FILTRATO da EMA Trend:', assetUp, finalDir,
          '| trend:', trendRialzista ? 'RIALZISTA' : 'RIBASSISTA');
      }
    }

    // Calibrazione proxy: salva il rapporto entry/ETF al momento del segnale
    let proxyRatio = null;
    if (proxyMap[assetUp] && FINNHUB_KEY) {
      const proxyPrice = await getFinnhubPrice(proxyMap[assetUp]);
      if (proxyPrice && proxyPrice > 0) {
        proxyRatio = entryNum / proxyPrice;
        console.log('Proxy calibrato:', assetUp, '=', proxyMap[assetUp],
          'x', proxyRatio.toFixed(4), '| entry:', entryNum, '| ETF:', proxyPrice);
      }
    }

    const pos = {
      asset: assetUp, direction: finalDir, entry: entryNum,
      sl: lv.sl, tp: lv.tp, openedAt: new Date(), trend: trendValue,
      proxyRatio: proxyRatio
    };

    const dbId = await dbInsertTrade(pos, lv, isFiltered);
    pos.dbId = dbId;

    if (isFiltered) {
      // Tracciata in ombra: monitorata ma non notificata
      shadowPositions.push(pos);
            return res.json({ ok: true, skipped: true, reason: 'contro-trend EMA', shadow: true });
    }

    // Segnale valido: notifica su Telegram
    const stats = await getWinRates(assetUp);
    positions.push(pos);
    await sendTelegram(buildEntryMessage(assetUp, finalDir, entryNum, lv, stats, trendValue));
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
  
    console.log('Filtro EMA Trend:', TREND_FILTER_ENABLED ? 'ATTIVO' : 'DISATTIVO');
  console.log('Finnhub:', FINNHUB_KEY ? 'configurato' : 'NON configurato');
  await fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/deleteWebhook');
  console.log('Webhook rimosso, polling attivo');
  setInterval(checkPositions, 3 * 60 * 1000);
  setInterval(pollTelegram, 3000);
  setInterval(checkScheduledReports, 60 * 1000);
  setInterval(pingSupabase, 60 * 60 * 1000);
  pingSupabase();
  await reloadOpenPositions();
});
