import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, timeout } from 'rxjs/operators';
import { Candle } from '../components/stock-anaysis/technical-analysis';
import { environment } from '../../environments/environment';

// Misma URL que usa yahoo-finance.service.ts (ya incluye /api)
const API_BASE = environment.yahooFinance.backendUrl;

export interface HistoryResponse {
  symbol: string;
  currency: string;
  candles: Candle[];
  stale?: boolean;
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private cache = new Map<string, Observable<HistoryResponse>>();

  constructor(private http: HttpClient) {}

  /**
   * Histórico diario (5 años). Las dos pantallas (gráfica y análisis técnico)
   * comparten la misma petición gracias a la caché por símbolo.
   * El timeout de 70 s cubre el arranque en frío del plan gratuito de Render.
   */
  getHistory(symbol: string): Observable<HistoryResponse> {
    let obs = this.cache.get(symbol);
    if (!obs) {
      obs = this.http
        .get<HistoryResponse>(`${API_BASE}/history/${encodeURIComponent(symbol)}`)
        .pipe(timeout(70000), shareReplay({ bufferSize: 1, refCount: false }));
      this.cache.set(symbol, obs);
    }
    return obs;
  }
}