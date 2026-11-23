import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { YahooFinanceService } from './yahoo-finance.service';

export interface Recommendation {
  label: string;                       // 'COMPRA FUERTE' | 'COMPRA' | 'NEUTRAL - ESPERAR' | 'VENTA' | 'VENTA FUERTE'
  level: 'buy' | 'sell' | 'neutral';
  gauge: number;                       // 0-100 (50 = neutral)
  stale?: boolean;                     // true si el backend sirvió un dato guardado
}
/** undefined = cargando · null = sin datos · objeto = recomendación */
export type RecEntry = Recommendation | null;

const TTL_MS = 5 * 60 * 1000;          // refresco de cada valor
const RETRY_AFTER_ERROR_MS = 60 * 1000;
const CHUNK = 10;                      // símbolos por petición (los resultados llegan por tandas)
const VALID = /^[\^A-Za-z0-9.\-=]{1,20}$/;

/**
 * Valoración técnica de cada valor para la tabla del IBEX 35.
 * El cálculo lo hace el backend (/api/recommendations) con el MISMO código e histórico
 * que la pantalla de detalle, así que las cifras coinciden.
 * Las peticiones de varias filas se agrupan en una sola (batching).
 */
@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly state$ = new BehaviorSubject<Record<string, RecEntry>>({});
  readonly recs$: Observable<Record<string, RecEntry>> = this.state$.asObservable();

  private pending = new Set<string>();
  private inflight = new Set<string>();
  private nextRefresh = new Map<string, number>();   // ticker -> momento a partir del cual puede pedirse de nuevo
  private watchers = new Map<string, number>();      // ticker -> nº de badges visibles
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private tick: ReturnType<typeof setInterval> | null = null;

  constructor(private http: HttpClient, private yahoo: YahooFinanceService) {}

  /** Símbolo de Yahoo para un nombre de la tabla, o null si no está en el mapa (p. ej. valores sin ticker). */
  tickerOf(name: string): string | null {
    const t = this.yahoo.getTicker(name);
    return t !== name && VALID.test(t) ? t : null;
  }

  snapshot(): Record<string, RecEntry> { return this.state$.value; }

  /** Un badge empieza a mostrar este valor. Devuelve la función para dejar de observarlo. */
  watch(name: string): () => void {
    const t = this.tickerOf(name);
    if (!t) return () => {};
    this.watchers.set(t, (this.watchers.get(t) ?? 0) + 1);
    this.requestTicker(t);
    this.ensureTicker();
    return () => {
      const n = (this.watchers.get(t) ?? 1) - 1;
      if (n <= 0) this.watchers.delete(t); else this.watchers.set(t, n);
    };
  }

  // ---------------------------------------------------------------------------
  private requestTicker(t: string): void {
    if (this.inflight.has(t) || this.pending.has(t)) return;
    if ((this.nextRefresh.get(t) ?? 0) > Date.now()) return;
    this.pending.add(t);
    if (!this.flushTimer) this.flushTimer = setTimeout(() => this.flush(), 50);
  }

  /** Refresca cada 5 min solo lo que está visible en pantalla. */
  private ensureTicker(): void {
    if (this.tick) return;
    this.tick = setInterval(() => {
      for (const t of this.watchers.keys()) this.requestTicker(t);
    }, 60_000);
  }

  private flush(): void {
    this.flushTimer = null;
    const batch = [...this.pending];
    this.pending.clear();
    for (let i = 0; i < batch.length; i += CHUNK) this.fetchChunk(batch.slice(i, i + CHUNK));
  }

  private fetchChunk(symbols: string[]): void {
    symbols.forEach((s) => this.inflight.add(s));
    const url = `${environment.yahooFinance.backendUrl}/recommendations?symbols=${symbols.map(encodeURIComponent).join(',')}`;

    // timeout generoso: cubre el arranque en frío del plan gratuito de Render
    this.http.get<Record<string, any>>(url).pipe(timeout(90000)).subscribe({
      next: (res) => {
        const cur = this.state$.value;
        const upd: Record<string, RecEntry> = {};
        for (const s of symbols) {
          const r = res?.[s];
          if (r && !r.error && typeof r.gauge === 'number') {
            upd[s] = { label: r.label, level: r.level, gauge: r.gauge, stale: r.stale === true };
            this.nextRefresh.set(s, Date.now() + TTL_MS);
          } else {
            upd[s] = cur[s] ?? null;               // conserva el valor anterior si lo había
            this.nextRefresh.set(s, Date.now() + RETRY_AFTER_ERROR_MS);
          }
          this.inflight.delete(s);
        }
        this.state$.next({ ...cur, ...upd });
      },
      error: () => {
        const cur = this.state$.value;
        const upd: Record<string, RecEntry> = {};
        for (const s of symbols) {
          this.inflight.delete(s);
          this.nextRefresh.set(s, Date.now() + RETRY_AFTER_ERROR_MS);
          if (!(s in cur)) upd[s] = null;
        }
        if (Object.keys(upd).length) this.state$.next({ ...cur, ...upd });
      }
    });
  }
}