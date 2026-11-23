import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { NgClass } from '@angular/common';
import { Subscription } from 'rxjs';
import { RecEntry, RecommendationService } from '../../services/recommendation.service';

/**
 * Celda "Recomendación" de la tabla: <app-recommendation-badge [name]="stock.name" />
 * Verde = compra, rojo = venta, ámbar = neutral. El número es la puntuación técnica
 * (0-100; 50 = neutral), la misma que se muestra en la pantalla de detalle.
 */
@Component({
  selector: 'app-recommendation-badge',
  standalone: true,
  imports: [NgClass],
  template: `
    @if (entry === undefined) {
      <span class="rb wait" title="Calculando análisis técnico…">…</span>
    } @else if (entry === null) {
      <span class="rb none" title="Sin datos suficientes para el análisis técnico">—</span>
    } @else {
      <span class="rb" [ngClass]="cls" [attr.title]="tip">{{ text }}</span>
    }
  `,
  styles: [`
    :host { display: inline-block; }
    .rb { display: inline-block; min-width: 104px; text-align: center; padding: 4px 10px; border-radius: 6px;
          font-size: .78rem; font-weight: 700; letter-spacing: .02em; white-space: nowrap; border: 1px solid transparent; }
    .rb.buy      { background: #dcfce7; color: #166534; border-color: #86efac; }
    .rb.buy.strong  { background: #86efac; color: #14532d; border-color: #4ade80; }
    .rb.sell     { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
    .rb.sell.strong { background: #fca5a5; color: #7f1d1d; border-color: #f87171; }
    .rb.neutral  { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
    .rb.wait, .rb.none { color: #94a3b8; background: transparent; font-weight: 600; }
  `]
})
export class RecommendationBadgeComponent implements OnInit, OnChanges, OnDestroy {
  /** Nombre del valor tal y como aparece en la tabla (p. ej. "ACERINOX"). */
  @Input() name = '';

  entry: RecEntry | undefined;

  private ticker: string | null = null;
  private sub?: Subscription;
  private release?: () => void;

  constructor(private svc: RecommendationService) {}

  get cls(): string {
    const e = this.entry;
    return e ? e.level + (e.label.includes('FUERTE') ? ' strong' : '') : '';
  }
  get text(): string {
    const e = this.entry;
    return e ? `${e.label.split(' - ')[0]} ${e.gauge}%` : '';
  }
  get tip(): string {
    const e = this.entry;
    if (!e) return '';
    return `Puntuación técnica ${e.gauge}/100 (50 = neutral; por debajo, sesgo vendedor; por encima, sesgo comprador)` +
      (e.stale ? ' · dato guardado' : '') + ' · Orientativo, no es asesoramiento financiero';
  }

  ngOnInit(): void {
    this.sub = this.svc.recs$.subscribe((m) => this.sync(m));
    this.bind();
  }
  ngOnChanges(ch: SimpleChanges): void {
    if (ch['name'] && !ch['name'].firstChange) this.bind();
  }
  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.release?.();
  }

  private bind(): void {
    this.release?.();
    this.ticker = this.svc.tickerOf(this.name);
    this.release = this.svc.watch(this.name);
    this.sync(this.svc.snapshot());
  }

  private sync(m: Record<string, RecEntry>): void {
    this.entry = this.ticker ? m[this.ticker] : null;   // sin ticker => "—"
  }
}