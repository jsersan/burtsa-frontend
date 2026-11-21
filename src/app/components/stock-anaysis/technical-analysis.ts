/**
 * Análisis técnico puro (sin dependencias de Angular).
 * Recibe velas diarias (OHLCV) y devuelve indicadores, señales y una valoración.
 *
 * Información orientativa y con fines educativos: no es asesoramiento financiero.
 */

export interface Candle {
  t: number; // timestamp UNIX en segundos
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export type Series = (number | null)[];
export type SignalType = 'COMPRA' | 'VENTA' | 'NEUTRAL';

/** Mínimo de velas para poder calcular todo (Ichimoku necesita 52 + 26). */
export const MIN_CANDLES = 80;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const fill = (n: number): Series => new Array(n).fill(null);

// ---------------------------------------------------------------------------
// Indicadores básicos (cada uno devuelve una serie alineada con las velas)
// ---------------------------------------------------------------------------
export function sma(values: number[], period: number): Series {
  const out = fill(values.length);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** EMA sembrada con la SMA de los primeros `period` valores. Admite nulls al inicio. */
export function ema(values: Series, period: number): Series {
  const out = fill(values.length);
  const start = values.findIndex((v) => v != null);
  if (start < 0 || values.length - start < period) return out;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = start; i < start + period; i++) sum += values[i] as number;
  let prev = sum / period;
  out[start + period - 1] = prev;
  for (let i = start + period; i < values.length; i++) {
    prev = (values[i] as number) * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** RSI de Wilder. */
export function rsi(closes: number[], period = 14): Series {
  const out = fill(closes.length);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  const toRsi = () =>
    avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : 100 - 100 / (1 + avgGain / avgLoss);
  out[period] = toRsi();
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = toRsi();
  }
  return out;
}

export function macd(closes: number[], fast = 12, slow = 26, signalPeriod = 9) {
  const ef = ema(closes, fast);
  const es = ema(closes, slow);
  const line: Series = closes.map((_, i) =>
    ef[i] != null && es[i] != null ? (ef[i] as number) - (es[i] as number) : null
  );
  const signal = ema(line, signalPeriod);
  const hist: Series = line.map((v, i) =>
    v != null && signal[i] != null ? v - (signal[i] as number) : null
  );
  return { line, signal, hist };
}

/** ATR de Wilder. */
export function atr(c: Candle[], period = 14): Series {
  const out = fill(c.length);
  if (c.length <= period) return out;
  const tr: number[] = [c[0].h - c[0].l];
  for (let i = 1; i < c.length; i++) {
    tr.push(
      Math.max(c[i].h - c[i].l, Math.abs(c[i].h - c[i - 1].c), Math.abs(c[i].l - c[i - 1].c))
    );
  }
  let prev = 0;
  for (let i = 1; i <= period; i++) prev += tr[i];
  prev /= period;
  out[period] = prev;
  for (let i = period + 1; i < c.length; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

/** ADX, +DI y -DI (suavizado de Wilder). */
export function adx(c: Candle[], period = 14) {
  const n = c.length;
  const plusDI = fill(n);
  const minusDI = fill(n);
  const adxS = fill(n);
  if (n < period * 2 + 1) return { adx: adxS, plusDI, minusDI };

  const tr: number[] = [];
  const pdm: number[] = [];
  const mdm: number[] = [];
  for (let i = 1; i < n; i++) {
    const up = c[i].h - c[i - 1].h;
    const down = c[i - 1].l - c[i].l;
    pdm.push(up > down && up > 0 ? up : 0);
    mdm.push(down > up && down > 0 ? down : 0);
    tr.push(
      Math.max(c[i].h - c[i].l, Math.abs(c[i].h - c[i - 1].c), Math.abs(c[i].l - c[i - 1].c))
    );
  }

  let trS = 0;
  let pS = 0;
  let mS = 0;
  for (let j = 0; j < period; j++) {
    trS += tr[j];
    pS += pdm[j];
    mS += mdm[j];
  }

  const dx: number[] = [];
  const push = (j: number) => {
    const i = j + 1;
    const p = trS === 0 ? 0 : (100 * pS) / trS;
    const m = trS === 0 ? 0 : (100 * mS) / trS;
    plusDI[i] = p;
    minusDI[i] = m;
    dx.push(p + m === 0 ? 0 : (100 * Math.abs(p - m)) / (p + m));
  };
  push(period - 1);
  for (let j = period; j < tr.length; j++) {
    trS = trS - trS / period + tr[j];
    pS = pS - pS / period + pdm[j];
    mS = mS - mS / period + mdm[j];
    push(j);
  }

  // dx[k] corresponde a la vela i = period + k
  let a = dx.slice(0, period).reduce((x, y) => x + y, 0) / period;
  adxS[2 * period - 1] = a;
  for (let k = period; k < dx.length; k++) {
    a = (a * (period - 1) + dx[k]) / period;
    adxS[period + k] = a;
  }
  return { adx: adxS, plusDI, minusDI };
}

export function stochastic(c: Candle[], kPeriod = 14, dPeriod = 3) {
  const k = fill(c.length);
  const d = fill(c.length);
  for (let i = kPeriod - 1; i < c.length; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      hh = Math.max(hh, c[j].h);
      ll = Math.min(ll, c[j].l);
    }
    k[i] = hh === ll ? 50 : ((c[i].c - ll) / (hh - ll)) * 100;
  }
  for (let i = kPeriod - 1 + dPeriod - 1; i < c.length; i++) {
    let s = 0;
    for (let j = i - dPeriod + 1; j <= i; j++) s += k[j] as number;
    d[i] = s / dPeriod;
  }
  return { k, d };
}

export function williamsR(c: Candle[], period = 14): Series {
  const out = fill(c.length);
  for (let i = period - 1; i < c.length; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hh = Math.max(hh, c[j].h);
      ll = Math.min(ll, c[j].l);
    }
    out[i] = hh === ll ? -50 : ((hh - c[i].c) / (hh - ll)) * -100;
  }
  return out;
}

export function cci(c: Candle[], period = 20): Series {
  const out = fill(c.length);
  const tp = c.map((x) => (x.h + x.l + x.c) / 3);
  for (let i = period - 1; i < c.length; i++) {
    let mean = 0;
    for (let j = i - period + 1; j <= i; j++) mean += tp[j];
    mean /= period;
    let md = 0;
    for (let j = i - period + 1; j <= i; j++) md += Math.abs(tp[j] - mean);
    md /= period;
    out[i] = md === 0 ? 0 : (tp[i] - mean) / (0.015 * md);
  }
  return out;
}

export function bollinger(closes: number[], period = 20, mult = 2) {
  const mid = sma(closes, period);
  const upper = fill(closes.length);
  const lower = fill(closes.length);
  const width = fill(closes.length); // ancho de banda en %
  for (let i = period - 1; i < closes.length; i++) {
    const m = mid[i] as number;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (closes[j] - m) ** 2;
    const sd = Math.sqrt(variance / period);
    upper[i] = m + mult * sd;
    lower[i] = m - mult * sd;
    width[i] = m === 0 ? 0 : (((upper[i] as number) - (lower[i] as number)) / m) * 100;
  }
  return { mid, upper, lower, width };
}

/** OBV acumulado desde el inicio del histórico recibido. */
export function obv(c: Candle[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < c.length; i++) {
    const d = c[i].c > c[i - 1].c ? c[i].v : c[i].c < c[i - 1].c ? -c[i].v : 0;
    out.push(out[i - 1] + d);
  }
  return out;
}

/** Aroon sobre la última vela (periodo 25 por defecto). */
export function aroon(c: Candle[], period = 25) {
  const n = c.length;
  let hi = n - 1 - period;
  let lo = hi;
  for (let i = n - 1 - period; i < n; i++) {
    if (c[i].h >= c[hi].h) hi = i;
    if (c[i].l <= c[lo].l) lo = i;
  }
  return {
    up: ((period - (n - 1 - hi)) / period) * 100,
    down: ((period - (n - 1 - lo)) / period) * 100
  };
}

/** Punto medio (máx+mín)/2 de las últimas `p` velas terminando en `end`. */
function midpoint(c: Candle[], end: number, p: number): number | null {
  if (end < p - 1 || end >= c.length) return null;
  let hh = -Infinity;
  let ll = Infinity;
  for (let j = end - p + 1; j <= end; j++) {
    hh = Math.max(hh, c[j].h);
    ll = Math.min(ll, c[j].l);
  }
  return (hh + ll) / 2;
}

/** Ichimoku: Tenkan, Kijun y nube vigente hoy (calculada con datos de hace 26 sesiones). */
export function ichimoku(c: Candle[]) {
  const i = c.length - 1;
  const tenkan = midpoint(c, i, 9);
  const kijun = midpoint(c, i, 26);
  const j = i - 26;
  const tj = midpoint(c, j, 9);
  const kj = midpoint(c, j, 26);
  const b = midpoint(c, j, 52);
  if (tenkan == null || kijun == null || tj == null || kj == null || b == null) return null;
  const senkouA = (tj + kj) / 2;
  const senkouB = b;
  const top = Math.max(senkouA, senkouB);
  const bottom = Math.min(senkouA, senkouB);
  const price = c[i].c;
  const state: 'alcista' | 'bajista' | 'neutral' =
    price > top ? 'alcista' : price < bottom ? 'bajista' : 'neutral';
  return { tenkan, kijun, senkouA, senkouB, state };
}

/** ¿Hubo cruce de `a` sobre/bajo `b` en las últimas `bars` velas? */
function recentCross(a: Series, b: Series, bars: number): 'up' | 'down' | null {
  const n = a.length;
  for (let i = n - 1; i >= Math.max(1, n - bars); i--) {
    const a0 = a[i - 1];
    const b0 = b[i - 1];
    const a1 = a[i];
    const b1 = b[i];
    if (a0 == null || b0 == null || a1 == null || b1 == null) continue;
    if (a0 <= b0 && a1 > b1) return 'up';
    if (a0 >= b0 && a1 < b1) return 'down';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Resultado del análisis
// ---------------------------------------------------------------------------
export interface Signal {
  name: string;
  type: SignalType;
  strength: number; // 0-100
  detail: string;
}

export type TrendDirection = 'alcista' | 'bajista' | 'lateral';
export type RecLevel = 'buy' | 'sell' | 'neutral';

export interface TechnicalAnalysis {
  asOf: number;
  price: number;

  sma20: number;
  sma50: number;
  ema10: number;
  ema50: number;

  macd: { line: number; signal: number; hist: number; cross: 'up' | 'down' | null };
  ichimoku: {
    tenkan: number;
    kijun: number;
    senkouA: number;
    senkouB: number;
    state: 'alcista' | 'bajista' | 'neutral';
  };
  adx: { adx: number; plusDI: number; minusDI: number };

  rsi: number;
  stochK: number;
  stochD: number;
  cci: number;
  williams: number;
  momentum: number;
  aroon: { up: number; down: number };

  bollinger: { upper: number; mid: number; lower: number; width: number; squeeze: boolean };
  atr: number;
  stopLoss: number;
  obv: number;
  volume: number;
  volumeAvg: number;
  volumeState: 'alto' | 'normal' | 'bajo';

  fib: { high: number; low: number; f236: number; f382: number; f500: number; f618: number };
  pivots: { p: number; r1: number; r2: number; s1: number; s2: number };

  signals: Signal[];
  recommendation: { level: RecLevel; label: string; description: string; gauge: number };
  trend: {
    direction: TrendDirection;
    label: string;
    description: string;
    strength: number; // 0-100
    confidence: number; // 0-100
    recommendedIndicators: string[];
  };
}

const fmt = (v: number, d = 2) => v.toFixed(d).replace('.', ',');

// ---------------------------------------------------------------------------
// Análisis completo
// ---------------------------------------------------------------------------
export function analyze(candles: Candle[]): TechnicalAnalysis | null {
  const c = candles.filter((x) => Number.isFinite(x.c) && Number.isFinite(x.h) && Number.isFinite(x.l));
  if (c.length < MIN_CANDLES) return null;

  const n = c.length;
  const i = n - 1;
  const closes = c.map((x) => x.c);
  const price = closes[i];
  const num = (s: Series) => s[i] as number;

  const sma20 = num(sma(closes, 20));
  const sma50 = num(sma(closes, 50));
  const ema10 = num(ema(closes, 10));
  const ema50 = num(ema(closes, 50));

  const m = macd(closes);
  const macdCross = recentCross(m.line, m.signal, 3);
  const macdV = { line: num(m.line), signal: num(m.signal), hist: num(m.hist), cross: macdCross };

  const ichi = ichimoku(c);
  if (!ichi) return null;

  const ad = adx(c);
  const adxV = { adx: num(ad.adx), plusDI: num(ad.plusDI), minusDI: num(ad.minusDI) };

  const rsiV = num(rsi(closes));
  const st = stochastic(c);
  const stochK = num(st.k);
  const stochD = num(st.d);
  const cciV = num(cci(c));
  const wr = num(williamsR(c));
  const momentum = price - closes[i - 10];
  const aro = aroon(c);

  const bb = bollinger(closes);
  const widths = (bb.width.slice(-126).filter((w) => w != null) as number[]);
  const curW = num(bb.width);
  const rank = widths.filter((w) => w <= curW).length / widths.length;
  const bollV = {
    upper: num(bb.upper),
    mid: num(bb.mid),
    lower: num(bb.lower),
    width: curW,
    squeeze: widths.length >= 60 && rank <= 0.2
  };

  const atrV = num(atr(c));
  const stopLoss = price - 2 * atrV;

  const obvV = obv(c)[i];
  const volume = c[i].v;
  const prev20 = c.slice(Math.max(0, i - 20), i).map((x) => x.v);
  const volumeAvg = prev20.length ? prev20.reduce((a, b) => a + b, 0) / prev20.length : 0;
  const ratio = volumeAvg > 0 ? volume / volumeAvg : 1;
  const volumeState: 'alto' | 'normal' | 'bajo' = ratio > 1.5 ? 'alto' : ratio < 0.5 ? 'bajo' : 'normal';

  // Fibonacci sobre los últimos 120 días
  const win = c.slice(-120);
  const high = Math.max(...win.map((x) => x.h));
  const low = Math.min(...win.map((x) => x.l));
  const range = high - low;
  const fib = {
    high,
    low,
    f236: high - range * 0.236,
    f382: high - range * 0.382,
    f500: high - range * 0.5,
    f618: high - range * 0.618
  };

  // Pivotes clásicos con la última vela disponible
  const last = c[i];
  const p = (last.h + last.l + last.c) / 3;
  const pivots = {
    p,
    r1: 2 * p - last.l,
    s1: 2 * p - last.h,
    r2: p + (last.h - last.l),
    s2: p - (last.h - last.l)
  };

  // ---------------------------- Señales -----------------------------------
  const signals: Signal[] = [];
  const add = (name: string, type: SignalType, strength: number, detail: string) =>
    signals.push({ name, type, strength: Math.round(clamp(strength, 0, 100)), detail });

  if (rsiV >= 70) add('RSI', 'VENTA', 50 + (rsiV - 70) * 2.5, `RSI en ${fmt(rsiV, 1)}: zona de sobrecompra`);
  else if (rsiV <= 30) add('RSI', 'COMPRA', 50 + (30 - rsiV) * 2.5, `RSI en ${fmt(rsiV, 1)}: zona de sobreventa`);

  if (macdCross === 'up') add('MACD', 'COMPRA', 80, 'Cruce alcista reciente del MACD sobre su señal');
  else if (macdCross === 'down') add('MACD', 'VENTA', 80, 'Cruce bajista reciente del MACD bajo su señal');

  const maCross = recentCross(sma(closes, 20), sma(closes, 50), 5);
  if (maCross === 'up') add('Medias móviles', 'COMPRA', 75, 'La SMA 20 cruza al alza la SMA 50');
  else if (maCross === 'down') add('Medias móviles', 'VENTA', 75, 'La SMA 20 cruza a la baja la SMA 50');

  if (price >= bollV.upper) add('Bollinger', 'VENTA', 60, 'El precio toca la banda superior (posible sobreextensión)');
  else if (price <= bollV.lower) add('Bollinger', 'COMPRA', 60, 'El precio toca la banda inferior (posible rebote)');

  if (stochK >= 80) add('Estocástico', 'VENTA', 55, `%K en ${fmt(stochK, 1)}: sobrecompra`);
  else if (stochK <= 20) add('Estocástico', 'COMPRA', 55, `%K en ${fmt(stochK, 1)}: sobreventa`);

  if (ichi.state === 'alcista') add('Ichimoku', 'COMPRA', 65, 'Precio por encima de la nube');
  else if (ichi.state === 'bajista') add('Ichimoku', 'VENTA', 65, 'Precio por debajo de la nube');

  if (adxV.adx >= 25) {
    const s = clamp(55 + (adxV.adx - 25) * 3, 0, 100);
    if (adxV.plusDI > adxV.minusDI) add('ADX', 'COMPRA', s, `Tendencia fuerte alcista (ADX ${fmt(adxV.adx, 1)})`);
    else add('ADX', 'VENTA', s, `Tendencia fuerte bajista (ADX ${fmt(adxV.adx, 1)})`);
  }

  // ATR: siempre informativo
  add('ATR', 'NEUTRAL', 50, `Stop Loss sugerido: ${fmt(stopLoss)} (precio − 2×ATR)`);

  // Valoración global: hace falta consenso entre varios indicadores
  const DIRECTIONAL = 7;
  const net = signals.reduce(
    (acc, s) => acc + (s.type === 'COMPRA' ? s.strength : s.type === 'VENTA' ? -s.strength : 0),
    0
  );
  const score = clamp(net / (DIRECTIONAL * 100), -1, 1);
  const nBuy = signals.filter((s) => s.type === 'COMPRA').length;
  const nSell = signals.filter((s) => s.type === 'VENTA').length;
  let level: RecLevel = 'neutral';
  let label = 'NEUTRAL - ESPERAR';
  let description = 'Señales mixtas - Esperar confirmación';
  if (score >= 0.4) { level = 'buy'; label = 'COMPRA FUERTE'; }
  else if (score >= 0.15) { level = 'buy'; label = 'COMPRA'; }
  else if (score <= -0.4) { level = 'sell'; label = 'VENTA FUERTE'; }
  else if (score <= -0.15) { level = 'sell'; label = 'VENTA'; }
  if (level !== 'neutral') description = `${nBuy} señales de compra frente a ${nSell} de venta`;
  const recommendation = { level, label, description, gauge: Math.round(50 + score * 50) };

  // ---------------------------- Tendencia ---------------------------------
  let votes = 0;
  votes += price > sma50 ? 1 : -1;
  votes += sma20 > sma50 ? 1 : -1;
  votes += macdV.hist > 0 ? 1 : -1;
  votes += adxV.plusDI > adxV.minusDI ? 1 : -1;
  votes += ichi.state === 'alcista' ? 1 : ichi.state === 'bajista' ? -1 : 0;

  let direction: TrendDirection = 'lateral';
  if (adxV.adx >= 20) direction = votes >= 2 ? 'alcista' : votes <= -2 ? 'bajista' : 'lateral';

  const adxText =
    adxV.adx < 20
      ? 'un valor bajo (<20) que indica ausencia de tendencia clara'
      : adxV.adx < 25
      ? 'un valor intermedio (20-25) que sugiere una tendencia moderada pero no consolidada'
      : adxV.adx < 40
      ? 'un valor alto (25-40) que indica una tendencia consolidada'
      : 'un valor muy alto (>40) que indica una tendencia muy fuerte';
  const macdText =
    macdV.hist > 0
      ? `El MACD está por encima de su señal (histograma positivo de ${fmt(macdV.hist)}), lo que apunta a momentum alcista.`
      : `El MACD está por debajo de su señal (histograma negativo de ${fmt(macdV.hist)}), lo que apunta a momentum bajista.`;
  const ichiText =
    ichi.state === 'alcista'
      ? 'El precio está por encima de la nube de Ichimoku, lo que confirma fortaleza.'
      : ichi.state === 'bajista'
      ? 'El precio está por debajo de la nube de Ichimoku, lo que confirma debilidad.'
      : 'El precio se encuentra dentro de la nube de Ichimoku, lo que indica indecisión del mercado.';
  const momText =
    momentum >= 0
      ? `El Momentum es positivo (${fmt(momentum)}): el precio actual está por encima del de hace 10 periodos.`
      : `El Momentum es negativo (${fmt(momentum)}): el precio actual está por debajo del de hace 10 periodos.`;

  const trend = {
    direction,
    label: direction.toUpperCase(),
    description: `El ADX muestra ${fmt(adxV.adx, 1)}, ${adxText}. ${macdText} ${ichiText} ${momText}`,
    strength: Math.round(clamp((adxV.adx - 10) / 30, 0, 1) * 100),
    confidence: Math.round((Math.abs(votes) / 5) * 100),
    recommendedIndicators:
      direction === 'lateral'
        ? ['RSI', 'Estocástico', 'Bollinger Bands', 'CCI']
        : ['SMA', 'MACD', 'ADX', 'Bollinger Bands']
  };

  return {
    asOf: c[i].t,
    price,
    sma20,
    sma50,
    ema10,
    ema50,
    macd: macdV,
    ichimoku: ichi,
    adx: adxV,
    rsi: rsiV,
    stochK,
    stochD,
    cci: cciV,
    williams: wr,
    momentum,
    aroon: aro,
    bollinger: bollV,
    atr: atrV,
    stopLoss,
    obv: obvV,
    volume,
    volumeAvg,
    volumeState,
    fib,
    pivots,
    signals,
    recommendation,
    trend
  };
}