import { Injectable } from '@angular/core';

export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  // Medias Móviles
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema10: number | null;
  ema20: number | null;
  ema50: number | null;
  
  // MACD
  macd: {
    value: number;
    signal: number;
    histogram: number;
  } | null;
  
  // Ichimoku
  ichimoku: {
    tenkan: number;
    kijun: number;
    senkouA: number;
    senkouB: number;
    chikou: number;
    cloudColor: 'green' | 'red';
  } | null;
  
  // ADX
  adx: {
    value: number;
    plusDI: number;
    minusDI: number;
  } | null;
  
  // Parabolic SAR
  sar: number | null;
  
  // Osciladores
  rsi: number | null;
  stochastic: {
    k: number;
    d: number;
  } | null;
  cci: number | null;
  williamsR: number | null;
  momentum: number | null;
  aroon: {
    up: number;
    down: number;
  } | null;
  
  // NUEVOS: Volatilidad y Volumen
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
  } | null;
  
  atr: number | null;
  
  obv: number | null;
  
  volumeAnalysis: {
    current: number;
    average: number;
    trend: 'high' | 'low' | 'normal';
    spike: boolean;
  } | null;
  
  // NUEVOS: Soporte/Resistencia
  fibonacci: {
    level236: number;
    level382: number;
    level50: number;
    level618: number;
    high: number;
    low: number;
  } | null;
  
  pivotPoints: {
    pivot: number;
    r1: number;
    r2: number;
    r3: number;
    s1: number;
    s2: number;
    s3: number;
  } | null;
}

export interface TradingSignal {
  indicator: string;
  type: 'buy' | 'sell' | 'neutral' | 'strong_buy' | 'strong_sell';
  message: string;
  strength: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class TechnicalIndicatorsService {

  constructor() {}

  /**
   * Calcular todos los indicadores técnicos
   */
  calculateIndicators(priceHistory: PriceData[]): TechnicalIndicators {
    if (!priceHistory || priceHistory.length < 50) {
      return this.getEmptyIndicators();
    }

    const closes = priceHistory.map(p => p.close);
    const highs = priceHistory.map(p => p.high);
    const lows = priceHistory.map(p => p.low);

    return {
      // Medias Móviles
      sma20: this.calculateSMA(closes, 20),
      sma50: this.calculateSMA(closes, 50),
      sma200: this.calculateSMA(closes, 200),
      ema10: this.calculateEMA(closes, 10),
      ema20: this.calculateEMA(closes, 20),
      ema50: this.calculateEMA(closes, 50),
      
      // MACD
      macd: this.calculateMACD(closes),
      
      // Ichimoku
      ichimoku: this.calculateIchimoku(priceHistory),
      
      // ADX
      adx: this.calculateADX(priceHistory, 14),
      
      // Parabolic SAR
      sar: this.calculateParabolicSAR(priceHistory),
      
      // Osciladores
      rsi: this.calculateRSI(closes, 14),
      stochastic: this.calculateStochastic(priceHistory, 14),
      cci: this.calculateCCI(priceHistory, 20),
      williamsR: this.calculateWilliamsR(highs, lows, closes, 14),
      momentum: this.calculateMomentum(closes, 10),
      aroon: this.calculateAroon(highs, lows, 25),
      
      // NUEVOS: Volatilidad y Volumen
      bollingerBands: this.calculateBollingerBands(closes, 20),
      atr: this.calculateATR(priceHistory, 14),
      obv: this.calculateOBV(priceHistory),
      volumeAnalysis: this.calculateVolumeAnalysis(priceHistory),
      
      // NUEVOS: Soporte/Resistencia
      fibonacci: this.calculateFibonacci(priceHistory, 50),
      pivotPoints: this.calculatePivotPoints(priceHistory)
    };
  }

  /**
   * Generar señales de trading
   */
  generateSignals(indicators: TechnicalIndicators, currentPrice: number): TradingSignal[] {
    const signals: TradingSignal[] = [];

    // SMA
    if (indicators.sma20 && indicators.sma50) {
      if (currentPrice > indicators.sma20 && currentPrice > indicators.sma50) {
        signals.push({
          indicator: 'SMA',
          type: 'buy',
          message: 'Precio por encima de SMA20 y SMA50 - Tendencia alcista',
          strength: 70,
          timestamp: new Date()
        });
      } else if (currentPrice < indicators.sma20 && currentPrice < indicators.sma50) {
        signals.push({
          indicator: 'SMA',
          type: 'sell',
          message: 'Precio por debajo de SMA20 y SMA50 - Tendencia bajista',
          strength: 70,
          timestamp: new Date()
        });
      }
    }

    // EMA
    if (indicators.ema10 && indicators.ema50) {
      if (indicators.ema10 > indicators.ema50) {
        signals.push({
          indicator: 'EMA',
          type: 'buy',
          message: 'EMA10 cruzó por encima de EMA50 - Golden Cross',
          strength: 80,
          timestamp: new Date()
        });
      } else if (indicators.ema10 < indicators.ema50) {
        signals.push({
          indicator: 'EMA',
          type: 'sell',
          message: 'EMA10 cruzó por debajo de EMA50 - Death Cross',
          strength: 80,
          timestamp: new Date()
        });
      }
    }

    // MACD
    if (indicators.macd) {
      if (indicators.macd.histogram > 0 && indicators.macd.value > indicators.macd.signal) {
        signals.push({
          indicator: 'MACD',
          type: 'buy',
          message: 'MACD cruzó por encima de la señal - Momentum alcista',
          strength: 75,
          timestamp: new Date()
        });
      } else if (indicators.macd.histogram < 0 && indicators.macd.value < indicators.macd.signal) {
        signals.push({
          indicator: 'MACD',
          type: 'sell',
          message: 'MACD cruzó por debajo de la señal - Momentum bajista',
          strength: 75,
          timestamp: new Date()
        });
      }
    }

    // Ichimoku
    if (indicators.ichimoku) {
      if (indicators.ichimoku.cloudColor === 'green' && currentPrice > indicators.ichimoku.senkouA) {
        signals.push({
          indicator: 'Ichimoku',
          type: 'buy',
          message: 'Precio sobre nube verde - Tendencia alcista fuerte',
          strength: 85,
          timestamp: new Date()
        });
      } else if (indicators.ichimoku.cloudColor === 'red' && currentPrice < indicators.ichimoku.senkouB) {
        signals.push({
          indicator: 'Ichimoku',
          type: 'sell',
          message: 'Precio bajo nube roja - Tendencia bajista fuerte',
          strength: 85,
          timestamp: new Date()
        });
      }
    }

    // ADX
    if (indicators.adx) {
      if (indicators.adx.value > 25) {
        if (indicators.adx.plusDI > indicators.adx.minusDI) {
          signals.push({
            indicator: 'ADX',
            type: 'buy',
            message: `Tendencia alcista fuerte (ADX: ${indicators.adx.value.toFixed(1)})`,
            strength: Math.min(indicators.adx.value, 100),
            timestamp: new Date()
          });
        } else {
          signals.push({
            indicator: 'ADX',
            type: 'sell',
            message: `Tendencia bajista fuerte (ADX: ${indicators.adx.value.toFixed(1)})`,
            strength: Math.min(indicators.adx.value, 100),
            timestamp: new Date()
          });
        }
      }
    }

    // RSI
    if (indicators.rsi !== null) {
      if (indicators.rsi > 70) {
        signals.push({
          indicator: 'RSI',
          type: 'sell',
          message: `Sobrecompra (RSI: ${indicators.rsi.toFixed(1)}) - Posible corrección`,
          strength: Math.min((indicators.rsi - 70) * 3, 100),
          timestamp: new Date()
        });
      } else if (indicators.rsi < 30) {
        signals.push({
          indicator: 'RSI',
          type: 'buy',
          message: `Sobreventa (RSI: ${indicators.rsi.toFixed(1)}) - Posible rebote`,
          strength: Math.min((30 - indicators.rsi) * 3, 100),
          timestamp: new Date()
        });
      }
    }

    // Estocástico
    if (indicators.stochastic) {
      if (indicators.stochastic.k > 80 && indicators.stochastic.k > indicators.stochastic.d) {
        signals.push({
          indicator: 'Estocástico',
          type: 'sell',
          message: 'Sobrecompra - %K cruzó por encima de %D en zona alta',
          strength: 70,
          timestamp: new Date()
        });
      } else if (indicators.stochastic.k < 20 && indicators.stochastic.k < indicators.stochastic.d) {
        signals.push({
          indicator: 'Estocástico',
          type: 'buy',
          message: 'Sobreventa - %K cruzó por debajo de %D en zona baja',
          strength: 70,
          timestamp: new Date()
        });
      }
    }

    // NUEVAS SEÑALES: Bandas de Bollinger
    if (indicators.bollingerBands) {
      const bb = indicators.bollingerBands;
      
      if (currentPrice <= bb.lower) {
        signals.push({
          indicator: 'Bollinger Bands',
          type: 'buy',
          message: `Precio tocó banda inferior (${bb.lower.toFixed(2)}€) - Posible rebote`,
          strength: 75,
          timestamp: new Date()
        });
      } else if (currentPrice >= bb.upper) {
        signals.push({
          indicator: 'Bollinger Bands',
          type: 'sell',
          message: `Precio tocó banda superior (${bb.upper.toFixed(2)}€) - Posible corrección`,
          strength: 75,
          timestamp: new Date()
        });
      }
      
      if (bb.bandwidth < 10) {
        signals.push({
          indicator: 'Bollinger Squeeze',
          type: 'neutral',
          message: 'Bandas estrechas - Preparación para gran movimiento',
          strength: 60,
          timestamp: new Date()
        });
      }
    }

    // NUEVAS SEÑALES: ATR
    if (indicators.atr !== null) {
      const stopDistance = indicators.atr * 2;
      signals.push({
        indicator: 'ATR',
        type: 'neutral',
        message: `Stop Loss sugerido: ${stopDistance.toFixed(2)}€ (2x ATR)`,
        strength: 50,
        timestamp: new Date()
      });
    }

    // NUEVAS SEÑALES: Volumen
    if (indicators.volumeAnalysis) {
      const vol = indicators.volumeAnalysis;
      
      if (vol.spike) {
        const priceChange = currentPrice - (currentPrice * 0.99);
        if (priceChange > 0) {
          signals.push({
            indicator: 'Volumen',
            type: 'buy',
            message: `Pico de volumen alcista (${((vol.current/vol.average)*100).toFixed(0)}% vs promedio)`,
            strength: 70,
            timestamp: new Date()
          });
        }
      } else if (vol.trend === 'low') {
        signals.push({
          indicator: 'Volumen',
          type: 'neutral',
          message: 'Volumen bajo - Falta de convicción en movimiento',
          strength: 40,
          timestamp: new Date()
        });
      }
    }

    // NUEVAS SEÑALES: Fibonacci
    if (indicators.fibonacci) {
      const fib = indicators.fibonacci;
      const tolerance = (fib.high - fib.low) * 0.02;
      
      if (Math.abs(currentPrice - fib.level618) < tolerance) {
        signals.push({
          indicator: 'Fibonacci',
          type: 'buy',
          message: `Precio cerca de retroceso 61.8% (${fib.level618.toFixed(2)}€) - Nivel clave de soporte`,
          strength: 80,
          timestamp: new Date()
        });
      } else if (Math.abs(currentPrice - fib.level382) < tolerance) {
        signals.push({
          indicator: 'Fibonacci',
          type: 'neutral',
          message: `Precio en retroceso 38.2% (${fib.level382.toFixed(2)}€) - Zona de pausa`,
          strength: 60,
          timestamp: new Date()
        });
      }
    }

    // NUEVAS SEÑALES: Puntos Pivote
    if (indicators.pivotPoints) {
      const pp = indicators.pivotPoints;
      
      if (currentPrice > pp.pivot && currentPrice < pp.r1) {
        signals.push({
          indicator: 'Pivot Points',
          type: 'buy',
          message: `Precio sobre pivot (${pp.pivot.toFixed(2)}€) - Objetivo R1: ${pp.r1.toFixed(2)}€`,
          strength: 65,
          timestamp: new Date()
        });
      } else if (currentPrice < pp.pivot && currentPrice > pp.s1) {
        signals.push({
          indicator: 'Pivot Points',
          type: 'sell',
          message: `Precio bajo pivot (${pp.pivot.toFixed(2)}€) - Soporte S1: ${pp.s1.toFixed(2)}€`,
          strength: 65,
          timestamp: new Date()
        });
      }
    }

    return signals;
  }

  /**
   * Obtener consenso general
   */
  getConsensus(signals: TradingSignal[]): { type: string; strength: number; message: string } {
    if (signals.length === 0) {
      return { type: 'neutral', strength: 0, message: 'Sin señales suficientes' };
    }

    let buyScore = 0;
    let sellScore = 0;
    let totalWeight = 0;

    signals.forEach(signal => {
      const weight = signal.strength / 100;
      totalWeight += weight;

      if (signal.type === 'buy' || signal.type === 'strong_buy') {
        buyScore += weight * (signal.type === 'strong_buy' ? 1.5 : 1);
      } else if (signal.type === 'sell' || signal.type === 'strong_sell') {
        sellScore += weight * (signal.type === 'strong_sell' ? 1.5 : 1);
      }
    });

    const buyPercent = (buyScore / totalWeight) * 100;
    const sellPercent = (sellScore / totalWeight) * 100;

    if (buyPercent > sellPercent && buyPercent > 60) {
      return {
        type: 'buy',
        strength: Math.round(buyPercent),
        message: `${signals.filter(s => s.type === 'buy' || s.type === 'strong_buy').length} indicadores sugieren COMPRA`
      };
    } else if (sellPercent > buyPercent && sellPercent > 60) {
      return {
        type: 'sell',
        strength: Math.round(sellPercent),
        message: `${signals.filter(s => s.type === 'sell' || s.type === 'strong_sell').length} indicadores sugieren VENTA`
      };
    } else {
      return {
        type: 'neutral',
        strength: 50,
        message: 'Señales mixtas - Esperar confirmación'
      };
    }
  }

  // ============================================
  // MÉTODOS DE CÁLCULO - INDICADORES EXISTENTES
  // ============================================

  private calculateSMA(data: number[], period: number): number | null {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  private calculateEMA(data: number[], period: number): number | null {
    if (data.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(data.slice(0, period), period)!;
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    return ema;
  }

  private calculateMACD(closes: number[]): { value: number; signal: number; histogram: number } | null {
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    if (!ema12 || !ema26) return null;
    
    const macdLine = ema12 - ema26;
    const macdHistory: number[] = [];
    
    for (let i = 26; i < closes.length; i++) {
      const e12 = this.calculateEMA(closes.slice(0, i + 1), 12)!;
      const e26 = this.calculateEMA(closes.slice(0, i + 1), 26)!;
      macdHistory.push(e12 - e26);
    }
    
    const signal = this.calculateEMA(macdHistory, 9) || 0;
    const histogram = macdLine - signal;
    
    return { value: macdLine, signal, histogram };
  }

  private calculateIchimoku(data: PriceData[]): any {
    if (data.length < 52) return null;
    const recent = data.slice(-52);
    const highs = recent.map(d => d.high);
    const lows = recent.map(d => d.low);
    
    const tenkan9 = highs.slice(-9);
    const tenkanLow9 = lows.slice(-9);
    const tenkan = (Math.max(...tenkan9) + Math.min(...tenkanLow9)) / 2;
    
    const kijun26 = highs.slice(-26);
    const kijunLow26 = lows.slice(-26);
    const kijun = (Math.max(...kijun26) + Math.min(...kijunLow26)) / 2;
    
    const senkouA = (tenkan + kijun) / 2;
    const senkouB = (Math.max(...highs) + Math.min(...lows)) / 2;
    const chikou = recent[recent.length - 1].close;
    
    return {
      tenkan,
      kijun,
      senkouA,
      senkouB,
      chikou,
      cloudColor: senkouA > senkouB ? 'green' : 'red'
    };
  }

  private calculateADX(data: PriceData[], period: number): any {
    if (data.length < period + 1) return null;
    const tr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevHigh = data[i - 1].high;
      const prevLow = data[i - 1].low;
      const prevClose = data[i - 1].close;
      
      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      tr.push(Math.max(tr1, tr2, tr3));
      
      const upMove = high - prevHigh;
      const downMove = prevLow - low;
      
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
    
    const smoothTR = this.smoothATR(tr, period);
    const smoothPlusDM = this.smoothATR(plusDM, period);
    const smoothMinusDM = this.smoothATR(minusDM, period);
    
    const plusDI = (smoothPlusDM / smoothTR) * 100;
    const minusDI = (smoothMinusDM / smoothTR) * 100;
    const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
    
    return { value: dx, plusDI, minusDI };
  }

  private smoothATR(data: number[], period: number): number {
    if (data.length < period) return 0;
    return data.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  private calculateParabolicSAR(data: PriceData[]): number | null {
    if (data.length < 5) return null;
    const recent = data.slice(-5);
    const lastClose = recent[recent.length - 1].close;
    const minLow = Math.min(...recent.map(d => d.low));
    const maxHigh = Math.max(...recent.map(d => d.high));
    return lastClose > (minLow + maxHigh) / 2 ? minLow : maxHigh;
  }

  private calculateRSI(closes: number[], period: number): number | null {
    if (closes.length < period + 1) return null;
    let gains = 0;
    let losses = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateStochastic(data: PriceData[], period: number): { k: number; d: number } | null {
    if (data.length < period) return null;
    const recent = data.slice(-period);
    const currentClose = recent[recent.length - 1].close;
    const low = Math.min(...recent.map(d => d.low));
    const high = Math.max(...recent.map(d => d.high));
    const k = ((currentClose - low) / (high - low)) * 100;
    return { k, d: k };
  }

  private calculateCCI(data: PriceData[], period: number): number | null {
    if (data.length < period) return null;
    const recent = data.slice(-period);
    const typicalPrices = recent.map(d => (d.high + d.low + d.close) / 3);
    const sma = typicalPrices.reduce((a, b) => a + b, 0) / period;
    const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
    const currentTP = typicalPrices[typicalPrices.length - 1];
    return (currentTP - sma) / (0.015 * meanDeviation);
  }

  private calculateWilliamsR(highs: number[], lows: number[], closes: number[], period: number): number | null {
    if (highs.length < period) return null;
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
  }

  private calculateMomentum(closes: number[], period: number): number | null {
    if (closes.length < period + 1) return null;
    return closes[closes.length - 1] - closes[closes.length - 1 - period];
  }

  private calculateAroon(highs: number[], lows: number[], period: number): { up: number; down: number } | null {
    if (highs.length < period) return null;
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const daysSinceHigh = period - 1 - recentHighs.lastIndexOf(Math.max(...recentHighs));
    const daysSinceLow = period - 1 - recentLows.lastIndexOf(Math.min(...recentLows));
    const aroonUp = ((period - daysSinceHigh) / period) * 100;
    const aroonDown = ((period - daysSinceLow) / period) * 100;
    return { up: aroonUp, down: aroonDown };
  }

  // ============================================
  // MÉTODOS DE CÁLCULO - NUEVOS INDICADORES
  // ============================================

  /**
   * Bandas de Bollinger
   */
  private calculateBollingerBands(closes: number[], period: number = 20): any {
    if (closes.length < period) return null;
    
    const sma = this.calculateSMA(closes, period)!;
    const slice = closes.slice(-period);
    
    const variance = slice.reduce((sum, price) => {
      return sum + Math.pow(price - sma, 2);
    }, 0) / period;
    
    const stdDev = Math.sqrt(variance);
    const upper = sma + (2 * stdDev);
    const lower = sma - (2 * stdDev);
    const bandwidth = ((upper - lower) / sma) * 100;
    
    return { upper, middle: sma, lower, bandwidth };
  }

  /**
   * ATR (Average True Range)
   */
  private calculateATR(data: PriceData[], period: number = 14): number | null {
    if (data.length < period + 1) return null;
    
    const trueRanges: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trueRanges.push(tr);
    }
    
    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((a, b) => a + b, 0) / period;
  }

  /**
   * OBV (On-Balance Volume)
   */
  private calculateOBV(data: PriceData[]): number | null {
    if (data.length < 2) return null;
    
    let obv = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i].close > data[i - 1].close) {
        obv += data[i].volume;
      } else if (data[i].close < data[i - 1].close) {
        obv -= data[i].volume;
      }
    }
    
    return obv;
  }

  /**
   * Análisis de Volumen
   */
  private calculateVolumeAnalysis(data: PriceData[]): any {
    if (data.length < 20) return null;
    
    const recent20 = data.slice(-20);
    const volumes = recent20.map(d => d.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / 20;
    const currentVolume = data[data.length - 1].volume;
    
    const ratio = currentVolume / avgVolume;
    
    return {
      current: currentVolume,
      average: avgVolume,
      trend: ratio > 1.5 ? 'high' : ratio < 0.7 ? 'low' : 'normal',
      spike: ratio > 1.5
    };
  }

  /**
   * Fibonacci
   */
  private calculateFibonacci(data: PriceData[], periods: number = 50): any {
    if (data.length < periods) return null;
    
    const recent = data.slice(-periods);
    const highs = recent.map(d => d.high);
    const lows = recent.map(d => d.low);
    
    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const diff = high - low;
    
    return {
      level236: high - (diff * 0.236),
      level382: high - (diff * 0.382),
      level50: high - (diff * 0.5),
      level618: high - (diff * 0.618),
      high,
      low
    };
  }

  /**
   * Puntos Pivote
   */
  private calculatePivotPoints(data: PriceData[]): any {
    if (data.length < 2) return null;
    
    const yesterday = data[data.length - 2];
    const high = yesterday.high;
    const low = yesterday.low;
    const close = yesterday.close;
    
    const pivot = (high + low + close) / 3;
    const r1 = (2 * pivot) - low;
    const s1 = (2 * pivot) - high;
    const r2 = pivot + (high - low);
    const s2 = pivot - (high - low);
    const r3 = high + 2 * (pivot - low);
    const s3 = low - 2 * (high - pivot);
    
    return { pivot, r1, r2, r3, s1, s2, s3 };
  }

  /**
   * Indicadores vacíos
   */
  private getEmptyIndicators(): TechnicalIndicators {
    return {
      sma20: null,
      sma50: null,
      sma200: null,
      ema10: null,
      ema20: null,
      ema50: null,
      macd: null,
      ichimoku: null,
      adx: null,
      sar: null,
      rsi: null,
      stochastic: null,
      cci: null,
      williamsR: null,
      momentum: null,
      aroon: null,
      bollingerBands: null,
      atr: null,
      obv: null,
      volumeAnalysis: null,
      fibonacci: null,
      pivotPoints: null
    };
  }
}