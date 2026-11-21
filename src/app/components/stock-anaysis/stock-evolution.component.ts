import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { HistoryService } from '../../services/history.service';

type RangeKey = '1M' | '3M' | '6M' | '1A' | 'YTD' | '4A';
interface Pt { t: number; c: number; x: number; y: number }
interface Tick { value: number; y: number; label: string }
interface XLabel { x: number; label: string }
interface Hover { x: number; y: number; tipLeft: number; date: string; price: string }

@Component({
  selector: 'app-stock-evolution',
  standalone: true,
  template: `
    <section class="card">
      <div class="head">
        <h3>Evolución de {{ title || symbol }}</h3>
        <div class="ranges">
          @for (r of ranges; track r) {
            <button type="button" [class.active]="r === range" (click)="select(r)">{{ r }}</button>
          }
        </div>
      </div>

      @if (loading) {
        <div class="state">Cargando histórico… (si el servidor estaba dormido puede tardar hasta un minuto)</div>
      }
      @if (error) {
        <div class="state err">
          {{ error }}
          <button type="button" class="retry" (click)="load()">Reintentar</button>
        </div>
      }

      @if (!loading && !error && pts.length > 1) {
        <div class="chart-wrap">
          <svg class="chart" [attr.viewBox]="'0 0 ' + W + ' ' + H"
               (pointermove)="onMove($event)" (pointerleave)="hover = null">
            <defs>
              <linearGradient id="evoUp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#16a34a" stop-opacity="0.25" />
                <stop offset="100%" stop-color="#16a34a" stop-opacity="0.02" />
              </linearGradient>
              <linearGradient id="evoDown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ef4444" stop-opacity="0.25" />
                <stop offset="100%" stop-color="#ef4444" stop-opacity="0.02" />
              </linearGradient>
            </defs>

            @for (tk of yTicks; track tk.value) {
              <line class="grid" [attr.x1]="M.l" [attr.x2]="W - M.r" [attr.y1]="tk.y" [attr.y2]="tk.y" />
              <text class="ylabel" [attr.x]="W - M.r + 8" [attr.y]="tk.y + 4">{{ tk.label }}</text>
            }
            @for (xl of xLabels; track xl.x) {
              <text class="xlabel" text-anchor="end" [attr.x]="xl.x" [attr.y]="H - M.b + 16"
                    [attr.transform]="'rotate(-45 ' + xl.x + ' ' + (H - M.b + 16) + ')'">{{ xl.label }}</text>
            }

            <path [attr.d]="areaPath" [attr.fill]="up ? 'url(#evoUp)' : 'url(#evoDown)'" />
            <path [attr.d]="linePath" fill="none" [attr.stroke]="color" stroke-width="2.2"
                  stroke-linejoin="round" stroke-linecap="round" />

            @if (hover) {
              <line class="cross" [attr.x1]="hover.x" [attr.x2]="hover.x" [attr.y1]="M.t" [attr.y2]="H - M.b" />
              <circle [attr.cx]="hover.x" [attr.cy]="hover.y" r="4.5" [attr.fill]="color" stroke="#fff" stroke-width="2" />
            }
          </svg>
          @if (hover) {
            <div class="tip" [style.left.%]="hover.tipLeft">
              <strong>{{ hover.price }}</strong>
              <span>{{ hover.date }}</span>
            </div>
          }
        </div>

        <div class="stats">
          <div><span class="lbl">Máximo:</span><span class="val pos">{{ money(max) }}</span></div>
          <div><span class="lbl">Mínimo:</span><span class="val neg">{{ money(min) }}</span></div>
          <div><span class="lbl">Media:</span><span class="val">{{ money(avg) }}</span></div>
          <div>
            <span class="lbl">Variación:</span>
            <span class="val" [class.pos]="variation >= 0" [class.neg]="variation < 0">{{ pct(variation) }}</span>
          </div>
        </div>
        <p class="source">
          Fuente: Yahoo Finance (no oficial, puede ir con retraso)
          @if (asOfText) { · último dato {{ asOfText }} }
          @if (stale) { · <strong class="warn">⚠️ dato guardado: el proveedor no respondió</strong> }
        </p>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .card { background: #fff; border-radius: 14px; padding: 20px 22px; box-shadow: 0 1px 4px rgba(15, 23, 42, .08); }
    .head { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    h3 { margin: 0; font-size: 1.15rem; color: #0f172a; }
    .ranges { display: flex; gap: 6px; flex-wrap: wrap; }
    .ranges button { border: 1px solid #d1d5db; background: #fff; color: #374151; border-radius: 8px; padding: 6px 14px; font-weight: 600; cursor: pointer; font-size: .8rem; }
    .ranges button.active { background: #1f7a74; border-color: #1f7a74; color: #fff; }
    .state { padding: 40px 10px; text-align: center; color: #64748b; }
    .state.err { color: #b91c1c; }
    .retry { margin-left: 8px; border: 1px solid #b91c1c; color: #b91c1c; background: #fff; border-radius: 6px; padding: 4px 10px; cursor: pointer; }
    .chart-wrap { position: relative; }
    .chart { width: 100%; height: auto; display: block; touch-action: pan-y; }
    .grid { stroke: #e5e7eb; stroke-width: 1; }
    .cross { stroke: #94a3b8; stroke-width: 1; stroke-dasharray: 4 4; }
    .ylabel, .xlabel { font-size: 12px; fill: #64748b; }
    .tip { position: absolute; top: 4px; transform: translateX(-50%); background: #0f172a; color: #fff; border-radius: 8px; padding: 6px 10px; font-size: .8rem; display: flex; flex-direction: column; align-items: center; pointer-events: none; white-space: nowrap; }
    .tip span { opacity: .75; font-size: .72rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 16px; }
    .stats .lbl { display: block; font-size: .72rem; letter-spacing: .04em; text-transform: uppercase; color: #64748b; }
    .stats .val { font-size: 1.25rem; font-weight: 700; color: #0f172a; }
    .source { margin: 14px 0 0; font-size: .74rem; color: #94a3b8; }
    .source .warn { color: #b45309; }
    .pos { color: #059669 !important; }
    .neg { color: #dc2626 !important; }
  `]
})
export class StockEvolutionComponent implements OnChanges, OnDestroy {
  /** Símbolo de Yahoo, p. ej. "ACX.MC" (el mismo que usas en /api/quote/:symbol). */
  @Input() symbol = '';
  /** Nombre a mostrar en el título (opcional), p. ej. "ACERINOX". */
  @Input() title = '';

  readonly ranges: RangeKey[] = ['1M', '3M', '6M', '1A', 'YTD', '4A'];
  range: RangeKey = '1A';

  readonly W = 1000;
  readonly H = 360;
  readonly M = { l: 8, r: 78, t: 16, b: 62 };

  loading = false;
  error = '';
  currency = 'EUR';

  pts: Pt[] = [];
  yTicks: Tick[] = [];
  xLabels: XLabel[] = [];
  linePath = '';
  areaPath = '';
  max = 0;
  min = 0;
  avg = 0;
  variation = 0;
  hover: Hover | null = null;
  asOf = 0;
  stale = false;

  private all: { t: number; c: number }[] = [];
  private sub?: Subscription;
  private yLo = 0;
  private yHi = 1;

  constructor(private api: HistoryService) {}

  get up(): boolean { return this.variation >= 0; }
  get color(): string { return this.up ? '#16a34a' : '#ef4444'; }
  get asOfText(): string {
    return this.asOf
      ? new Date(this.asOf * 1000).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
      : '';
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['symbol'] && this.symbol) this.load();
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  select(r: RangeKey): void { this.range = r; this.hover = null; this.rebuild(); }

  load(): void {
    if (!this.symbol) return;
    this.sub?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.hover = null;
    this.sub = this.api.getHistory(this.symbol).subscribe({
      next: (res: any) => {
        const data = res as typeof res & { asOf?: number; stale?: boolean };
        this.all = (data.candles || []).map((k: { t: number; c: number }) => ({ t: k.t, c: k.c }));
        this.currency = data.currency || 'EUR';
        this.asOf = data.asOf || 0;
        this.stale = data.stale === true;
        this.loading = false;
        if (this.all.length < 2) this.error = 'No hay histórico disponible para este valor.';
        else this.rebuild();
      },
      error: (err: { status?: number }) => {
        this.loading = false;
        this.error = err && err.status === 404
          ? 'Valor no encontrado en el proveedor de datos.'
          : 'No se pudo cargar el histórico.';
      }
    });
  }

  // ------------------------------------------------------------ cálculo --
  private cutoff(r: RangeKey, lastT: number): number {
    const d = new Date(lastT * 1000);
    switch (r) {
      case '1M': d.setMonth(d.getMonth() - 1); break;
      case '3M': d.setMonth(d.getMonth() - 3); break;
      case '6M': d.setMonth(d.getMonth() - 6); break;
      case '1A': d.setFullYear(d.getFullYear() - 1); break;
      case '4A': d.setFullYear(d.getFullYear() - 4); break;
      case 'YTD': return new Date(d.getFullYear(), 0, 1).getTime() / 1000;
    }
    return d.getTime() / 1000;
  }

  private rebuild(): void {
    if (this.all.length < 2) { this.pts = []; return; }
    const from = this.cutoff(this.range, this.all[this.all.length - 1].t);
    const sel = this.all.filter((p) => p.t >= from);
    if (sel.length < 2) { this.pts = []; return; }

    const closes = sel.map((p) => p.c);
    this.max = Math.max(...closes);
    this.min = Math.min(...closes);
    this.avg = closes.reduce((a, b) => a + b, 0) / closes.length;
    this.variation = (closes[closes.length - 1] / closes[0] - 1) * 100;

    const ticks = this.niceTicks(this.min, this.max, 6);
    this.yLo = ticks[0];
    this.yHi = ticks[ticks.length - 1];

    const innerW = this.W - this.M.l - this.M.r;
    const innerH = this.H - this.M.t - this.M.b;
    const n = sel.length;
    this.pts = sel.map((p, i) => ({
      t: p.t,
      c: p.c,
      x: this.M.l + (i / (n - 1)) * innerW,
      y: this.M.t + (1 - (p.c - this.yLo) / (this.yHi - this.yLo)) * innerH
    }));

    this.yTicks = ticks.map((v) => ({
      value: v,
      y: this.M.t + (1 - (v - this.yLo) / (this.yHi - this.yLo)) * innerH,
      label: this.money(v, 2)
    }));

    const longSpan = sel[n - 1].t - sel[0].t > 300 * 86400;
    this.xLabels = [];
    const count = Math.min(8, n);
    for (let k = 0; k < count; k++) {
      const p = this.pts[Math.round((k * (n - 1)) / Math.max(1, count - 1))];
      this.xLabels.push({ x: p.x, label: this.dateLabel(p.t, longSpan) });
    }

    this.linePath = 'M' + this.pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');
    const base = this.H - this.M.b;
    this.areaPath = `${this.linePath} L${this.pts[n - 1].x.toFixed(1)},${base} L${this.pts[0].x.toFixed(1)},${base} Z`;
  }

  private niceTicks(min: number, max: number, count: number): number[] {
    const span = max - min || Math.abs(max) * 0.1 || 1;
    const raw = span / (count - 1);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const start = Math.floor(min / step) * step;
    const end = Math.ceil(max / step) * step;
    const out: number[] = [];
    for (let v = start; v <= end + step / 2; v += step) out.push(+v.toFixed(10));
    return out;
  }

  onMove(ev: MouseEvent): void {
    if (this.pts.length < 2) return;
    const rect = (ev.currentTarget as SVGSVGElement).getBoundingClientRect();
    const vx = ((ev.clientX - rect.left) / rect.width) * this.W;
    const ratio = (vx - this.M.l) / (this.W - this.M.l - this.M.r);
    const idx = Math.min(this.pts.length - 1, Math.max(0, Math.round(ratio * (this.pts.length - 1))));
    const p = this.pts[idx];
    this.hover = {
      x: p.x,
      y: p.y,
      tipLeft: Math.min(88, Math.max(12, (p.x / this.W) * 100)),
      date: new Date(p.t * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }),
      price: this.money(p.c)
    };
  }

  // ---------------------------------------------------------- formatos ---
  private dateLabel(t: number, long: boolean): string {
    const d = new Date(t * 1000);
    const s = long
      ? d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      : d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    return s.replace(/\./g, '');
  }

  money(v: number, decimals?: number): string {
    const d = decimals ?? (Math.abs(v) < 10 ? 3 : 2);
    try {
      return v.toLocaleString('es-ES', {
        style: 'currency', currency: this.currency,
        minimumFractionDigits: d, maximumFractionDigits: d
      });
    } catch {
      return v.toFixed(d).replace('.', ',') + ' ' + this.currency;
    }
  }

  pct(v: number): string {
    return (v >= 0 ? '+' : '') + v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }
}