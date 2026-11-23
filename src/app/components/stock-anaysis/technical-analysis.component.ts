import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { NgClass } from '@angular/common';
import { Subscription } from 'rxjs';
import { HistoryService } from '../../services/history.service';
import { TechnicalAnalysis, analyze, MIN_CANDLES } from './technical-analysis';

interface Item { label: string; value: string; cls?: string; note?: string; badge?: string; badgeCls?: string }
interface Group { title: string; items: Item[] }

@Component({
  selector: 'app-technical-analysis',
  standalone: true,
  imports: [NgClass],
  template: `
    <section class="ta">
      <h2 class="title">📊 Análisis Técnico</h2>

      @if (loading) { <div class="state">Calculando indicadores… (si el servidor estaba dormido puede tardar hasta un minuto)</div> }
      @if (error) {
        <div class="state err">{{ error }}
          @if (canRetry) { <button type="button" class="retry" (click)="load()">Reintentar</button> }
        </div>
      }

      @if (a) {
        <!-- Tendencia -->
        <div class="trend" [ngClass]="a.trend.direction">
          <div class="trend-icon">{{ trendIcon }}</div>
          <div class="trend-body">
            <h3>TENDENCIA {{ a.trend.label }}</h3>
            <p>{{ a.trend.description }}</p>
          </div>
          <div class="trend-meters">
            <div class="meter">
              <span class="m-lbl">FUERZA</span>
              <div class="bar"><i [style.width.%]="a.trend.strength"></i></div>
              <span class="m-val">{{ a.trend.strength }}%</span>
            </div>
            <div class="meter">
              <span class="m-lbl">CONFIANZA</span>
              <div class="bar"><i class="blue" [style.width.%]="a.trend.confidence"></i></div>
              <span class="m-val">{{ a.trend.confidence }}%</span>
            </div>
          </div>
          <div class="reco">
            <strong>📊 Indicadores Recomendados para esta Fase:</strong>
            <div class="chips">
              @for (r of a.trend.recommendedIndicators; track r) { <span class="chip">{{ r }}</span> }
            </div>
          </div>
        </div>

        <!-- Valoración global -->
        <div class="banner" [ngClass]="a.recommendation.level">
          <div class="b-icon">{{ recIcon }}</div>
          <div class="b-text">
            <h3>{{ a.recommendation.label }}</h3>
            <p>{{ a.recommendation.description }}</p>
          </div>
          <div class="gauge" title="50% = neutral · >50% sesgo comprador · <50% sesgo vendedor">{{ a.recommendation.gauge }}%</div>
        </div>

        <!-- Señales activas -->
        <h3 class="sub">🚦 Señales Activas ({{ a.signals.length }})</h3>
        <div class="signals">
          @for (s of a.signals; track s.name) {
            <div class="signal" [ngClass]="s.type.toLowerCase()">
              <div class="s-head"><strong>{{ s.name }}</strong><span class="s-type">{{ s.type }}</span></div>
              <div class="s-detail">{{ s.detail }}</div>
              <div class="s-bar"><i [style.width.%]="s.strength"></i><span>{{ s.strength }}%</span></div>
            </div>
          }
        </div>

        <!-- Indicadores técnicos -->
        <h3 class="sub">📊 Indicadores Técnicos</h3>
        @for (g of groups; track g.title) {
          <div class="group">
            <h4>{{ g.title }}</h4>
            <div class="grid">
              @for (it of g.items; track it.label) {
                <div class="item">
                  <span class="lbl">{{ it.label }}</span>
                  <span class="val" [ngClass]="it.cls || ''">{{ it.value }}</span>
                  @if (it.badge) { <span class="badge" [ngClass]="it.badgeCls || ''">{{ it.badge }}</span> }
                  @if (it.note) { <span class="note">{{ it.note }}</span> }
                </div>
              }
            </div>
          </div>
        }

        <p class="disclaimer">
          Datos diarios de Yahoo Finance; el último dato puede corresponder a una sesión en curso.
          Información orientativa con fines educativos: no constituye asesoramiento financiero.
        </p>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .title { margin: 0 0 14px; font-size: 1.35rem; color: #0f172a; }
    .sub { margin: 26px 0 12px; font-size: 1.1rem; color: #0f172a; }
    .state { padding: 30px 10px; text-align: center; color: #64748b; }
    .state.err { color: #b91c1c; }
    .retry { margin-left: 8px; border: 1px solid #b91c1c; color: #b91c1c; background: #fff; border-radius: 6px; padding: 4px 10px; cursor: pointer; }

    .trend { display: grid; grid-template-columns: auto 1fr minmax(180px, 240px); gap: 8px 20px; border-radius: 14px; padding: 20px; border: 2px solid; }
    .trend.alcista { background: #ecfdf3; border-color: #34d399; }
    .trend.bajista { background: #fef2f2; border-color: #f87171; }
    .trend.lateral { background: #fffbeb; border-color: #fbbf24; }
    .trend-icon { font-size: 2.6rem; line-height: 1; }
    .trend-body h3 { margin: 0 0 6px; font-size: 1.3rem; color: #0f172a; }
    .trend-body p { margin: 0; color: #374151; line-height: 1.55; font-size: .92rem; }
    .meter { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; align-items: center; margin-bottom: 10px; }
    .m-lbl { font-size: .72rem; letter-spacing: .05em; color: #64748b; grid-column: 1 / 3; }
    .m-val { font-weight: 700; font-size: .85rem; }
    .bar { height: 8px; border-radius: 6px; background: rgba(15, 23, 42, .1); overflow: hidden; }
    .bar i { display: block; height: 100%; background: #10b981; border-radius: 6px; }
    .bar i.blue { background: #3b82f6; }
    .reco { grid-column: 1 / 4; border-top: 1px solid rgba(15, 23, 42, .12); padding-top: 12px; margin-top: 6px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .chip { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; border-radius: 8px; padding: 5px 12px; font-weight: 600; font-size: .85rem; }

    .banner { margin-top: 16px; display: flex; align-items: center; gap: 16px; border-radius: 14px; padding: 18px 22px; border: 2px solid; }
    .banner.buy { background: #ecfdf3; border-color: #34d399; }
    .banner.sell { background: #fef2f2; border-color: #f87171; }
    .banner.neutral { background: #fffbeb; border-color: #f59e0b; }
    .b-icon { font-size: 2.4rem; line-height: 1; }
    .b-text { flex: 1; }
    .b-text h3 { margin: 0; font-size: 1.3rem; color: #0f172a; }
    .b-text p { margin: 4px 0 0; color: #475569; }
    .gauge { width: 78px; height: 78px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 1.2rem; color: #fff; background: #64748b; }
    .buy .gauge { background: #059669; }
    .sell .gauge { background: #dc2626; }

    .signals { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .signal { background: #fff; border-radius: 10px; padding: 14px 16px; border-left: 4px solid #f59e0b; box-shadow: 0 1px 3px rgba(15, 23, 42, .08); }
    .signal.compra { border-left-color: #059669; }
    .signal.venta { border-left-color: #dc2626; }
    .s-head { display: flex; justify-content: space-between; font-size: .95rem; }
    .s-type { font-size: .72rem; font-weight: 700; letter-spacing: .05em; color: #64748b; }
    .compra .s-type { color: #059669; }
    .venta .s-type { color: #dc2626; }
    .s-detail { margin: 6px 0 10px; font-size: .84rem; color: #64748b; }
    .s-bar { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; font-size: .8rem; font-weight: 600; }
    .s-bar i { display: block; height: 6px; border-radius: 4px; background: #f59e0b; }
    .compra .s-bar i { background: #059669; }
    .venta .s-bar i { background: #dc2626; }

    .group { background: #fff; border-radius: 12px; padding: 18px 20px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(15, 23, 42, .08); }
    .group h4 { margin: 0 0 12px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; font-size: 1rem; color: #0f172a; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px 20px; }
    .item { display: flex; flex-direction: column; gap: 3px; }
    .lbl { font-size: .72rem; letter-spacing: .04em; text-transform: uppercase; color: #64748b; }
    .val { font-size: 1.3rem; font-weight: 700; color: #0f172a; }
    .note { font-size: .72rem; color: #475569; }
    .badge { align-self: flex-start; font-size: .7rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: #dcfce7; color: #166534; }
    .badge.neg { background: #fee2e2; color: #991b1b; }
    .pos { color: #059669; }
    .neg { color: #dc2626; }
    .accent { color: #7c3aed; }
    .disclaimer { margin: 18px 0 0; font-size: .75rem; color: #94a3b8; text-align: center; }

    @media (max-width: 720px) {
      .trend { grid-template-columns: auto 1fr; }
      .trend-meters, .reco { grid-column: 1 / 3; }
    }
  `]
})
export class TechnicalAnalysisComponent implements OnChanges, OnDestroy {
  /** Símbolo de Yahoo, p. ej. "ACX.MC". */
  @Input() symbol = '';

  loading = false;
  error = '';
  canRetry = true;
  a: TechnicalAnalysis | null = null;
  groups: Group[] = [];
  currency = 'EUR';

  private sub?: Subscription;

  constructor(private api: HistoryService) {}

  get trendIcon(): string {
    return this.a?.trend.direction === 'alcista' ? '📈' : this.a?.trend.direction === 'bajista' ? '📉' : '↔️';
  }
  get recIcon(): string {
    return this.a?.recommendation.level === 'buy' ? '🟢' : this.a?.recommendation.level === 'sell' ? '🔴' : '🟡';
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['symbol'] && this.symbol) this.load();
  }
  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  load(): void {
    if (!this.symbol) return;
    this.sub?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.canRetry = true;
    this.a = null;
    this.groups = [];
    this.sub = this.api.getHistory(this.symbol).subscribe({
      next: (res) => {
        this.loading = false;
        this.currency = res.currency || 'EUR';
        const result = analyze(res.candles || []);
        if (!result) {
          this.canRetry = false;
          this.error = `No hay histórico suficiente para el análisis técnico (se necesitan al menos ${MIN_CANDLES} sesiones).`;
          return;
        }
        this.a = result;
        this.groups = this.buildGroups(result);
      },
      error: (err) => {
        this.loading = false;
        this.error = err && err.status === 404
          ? 'Valor no encontrado en el proveedor de datos.'
          : 'No se pudo cargar el histórico para el análisis técnico.';
      }
    });
  }

  // ------------------------------------------------------------- grupos --
  private buildGroups(a: TechnicalAnalysis): Group[] {
    const d = a.price < 10 ? 3 : 2;
    const n = (v: number, dec = d) => v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const sign = (v: number) => (v >= 0 ? 'pos' : 'neg');
    const vsPrice = (ma: number) => {
      const p = (a.price / ma - 1) * 100;
      return { badge: (p >= 0 ? '+' : '') + n(p, 2) + '%', badgeCls: p >= 0 ? '' : 'neg' };
    };
    const vol = (v: number) =>
      v >= 1e9 ? n(v / 1e9, 1) + 'B' : v >= 1e6 ? n(v / 1e6, 1) + 'M' : v >= 1e3 ? n(v / 1e3, 0) + 'K' : n(v, 0);
    let money: (v: number) => string;
    try {
      money = (v) => v.toLocaleString('es-ES', { style: 'currency', currency: this.currency, minimumFractionDigits: d, maximumFractionDigits: d });
    } catch {
      money = (v) => n(v) + ' ' + this.currency;
    }

    const adxNote = a.adx.adx < 20 ? 'Sin tendencia' : a.adx.adx < 25 ? 'Tendencia moderada' : a.adx.adx < 40 ? 'Tendencia fuerte' : 'Tendencia muy fuerte';
    const rsiCls = a.rsi >= 70 ? 'neg' : a.rsi <= 30 ? 'pos' : '';
    const rsiNote = a.rsi >= 70 ? 'Sobrecompra' : a.rsi <= 30 ? 'Sobreventa' : 'Zona neutral';
    const nube = a.ichimoku.state === 'alcista' ? '🟢 Alcista' : a.ichimoku.state === 'bajista' ? '🔴 Bajista' : '🟡 Dentro de la nube';
    const nubeCls = a.ichimoku.state === 'alcista' ? 'pos' : a.ichimoku.state === 'bajista' ? 'neg' : '';
    const volIcon = a.volumeState === 'alto' ? '🔺 Alto' : a.volumeState === 'bajo' ? '🔻 Bajo' : '➡️ Normal';

    return [
      { title: 'Medias Móviles', items: [
        { label: 'SMA 20', value: n(a.sma20), ...vsPrice(a.sma20) },
        { label: 'SMA 50', value: n(a.sma50), ...vsPrice(a.sma50) },
        { label: 'EMA 10', value: n(a.ema10) },
        { label: 'EMA 50', value: n(a.ema50) }
      ]},
      { title: 'MACD', items: [
        { label: 'MACD', value: n(a.macd.line), cls: sign(a.macd.line) },
        { label: 'Señal', value: n(a.macd.signal) },
        { label: 'Histograma', value: n(a.macd.hist), cls: sign(a.macd.hist) }
      ]},
      { title: 'Nube Ichimoku', items: [
        { label: 'Tenkan-sen', value: n(a.ichimoku.tenkan) },
        { label: 'Kijun-sen', value: n(a.ichimoku.kijun) },
        { label: 'Nube', value: nube, cls: nubeCls }
      ]},
      { title: 'ADX (Fuerza de Tendencia)', items: [
        { label: 'ADX', value: n(a.adx.adx), cls: 'accent', note: adxNote },
        { label: '+DI', value: n(a.adx.plusDI), cls: 'pos' },
        { label: '-DI', value: n(a.adx.minusDI), cls: 'neg' }
      ]},
      { title: 'Osciladores', items: [
        { label: 'RSI (14)', value: n(a.rsi), cls: rsiCls, note: rsiNote },
        { label: 'Estocástico %K', value: n(a.stochK), cls: a.stochK >= 80 ? 'neg' : a.stochK <= 20 ? 'pos' : '', note: '%D ' + n(a.stochD) },
        { label: 'CCI', value: n(a.cci), cls: a.cci >= 100 ? 'neg' : a.cci <= -100 ? 'pos' : '' },
        { label: 'Williams %R', value: n(a.williams), cls: a.williams >= -20 ? 'neg' : a.williams <= -80 ? 'pos' : '' },
        { label: 'Momentum', value: n(a.momentum), cls: sign(a.momentum) },
        { label: 'Aroon Up/Down', value: `${n(a.aroon.up, 2)} / ${n(a.aroon.down, 2)}` }
      ]},
      { title: 'Volatilidad y Volumen', items: [
        { label: 'Bollinger superior', value: n(a.bollinger.upper) },
        { label: 'Bollinger medio', value: n(a.bollinger.mid) },
        { label: 'Bollinger inferior', value: n(a.bollinger.lower), cls: 'neg' },
        { label: 'Ancho de banda', value: n(a.bollinger.width) + '%', note: a.bollinger.squeeze ? '🔥 Squeeze: posible movimiento fuerte próximo' : undefined },
        { label: 'ATR (14)', value: n(a.atr, 3) },
        { label: 'Stop Loss sugerido', value: money(a.stopLoss), cls: 'accent', note: 'Precio − 2×ATR' },
        { label: 'OBV', value: vol(a.obv), cls: sign(a.obv), note: 'Acumulado en el histórico' },
        { label: 'Volumen actual', value: vol(a.volume) },
        { label: 'Volumen promedio', value: vol(a.volumeAvg), note: 'Últimas 20 sesiones' },
        { label: 'Estado volumen', value: volIcon }
      ]},
      { title: 'Soporte y Resistencia', items: [
        { label: 'Fib 23,6%', value: n(a.fib.f236) },
        { label: 'Fib 38,2%', value: n(a.fib.f382) },
        { label: 'Fib 50%', value: n(a.fib.f500) },
        { label: 'Fib 61,8% ⭐', value: n(a.fib.f618), cls: 'accent', note: 'Máx/mín 120 sesiones' },
        { label: 'Pivot', value: n(a.pivots.p), cls: 'accent' },
        { label: 'R1 (Resistencia 1)', value: n(a.pivots.r1), cls: 'neg' },
        { label: 'R2 (Resistencia 2)', value: n(a.pivots.r2), cls: 'neg' },
        { label: 'S1 (Soporte 1)', value: n(a.pivots.s1), cls: 'pos' },
        { label: 'S2 (Soporte 2)', value: n(a.pivots.s2), cls: 'pos' }
      ]}
    ];
  }
}
