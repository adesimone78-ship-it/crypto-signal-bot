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
    tpEur: +(tpDist /
