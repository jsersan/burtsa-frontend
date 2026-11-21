import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError, timeout, switchMap, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class YahooFinanceService {
  
// ✅ CORRECTO - Lee de environment según el modo (dev/prod)
private backendUrl = environment.yahooFinance.backendUrl;

  // Mapeo de símbolos a Yahoo Finance
  private symbolMap: { [key: string]: string } = {
    'ACCIONA': 'ANA.MC',
    'ACCIONA ENERGÍA': 'ANE.MC',
    'ACERINOX': 'ACX.MC',
    'ACS CONST.': 'ACS.MC',
    'AENA': 'AENA.MC',
    'AMADEUS IT': 'AMS.MC',
    'ARCEL.MITTAL': 'MTS.MC',
    'BANKINTER': 'BKT.MC',
    'BBVA': 'BBVA.MC',
    'CAIXABANK': 'CABK.MC',
    'CELLNEX TEL.': 'CLNX.MC',
    'COLONIAL': 'COL.MC',
    'ENAGAS': 'ENG.MC',
    'ENDESA': 'ELE.MC',
    'FERROVIAL INTL RG': 'FER.MC',
    'FLUIDRA': 'FDR.MC',
    'GRIFOLS': 'GRF.MC',
    'IAG (IBERIA)': 'IAG.MC',
    'IBERDROLA': 'IBE.MC',
    'INDRA A': 'IDR.MC',
    'INDITEX': 'ITX.MC',
    'LABORAT.ROVI': 'ROVI.MC',
    'LOGISTA': 'LOG.MC',
    'MAPFRE': 'MAP.MC',
    'MERLIN PROP.': 'MRL.MC',
    'NATURGY': 'NTGY.MC',
    'PUIG BRANDS S RG': 'PUIG.MC',
    'REDEIA CORPORACIÓN': 'RED.MC',
    'REPSOL': 'REP.MC',
    'B.SABADELL': 'SAB.MC',
    'SACYR': 'SCYR.MC',
    'SANTANDER': 'SAN.MC',
    'SOLARIA': 'SLR.MC',
    'TELEFONICA': 'TEF.MC',
    'UNICAJA BANCO': 'UNI.MC',
    '^IBEX': '^IBEX'
  };

  constructor(private http: HttpClient) {
    // Log para debugging
    console.log(`🔧 YahooFinanceService inicializado`);
    console.log(`📡 Backend URL: ${this.backendUrl}`);
    console.log(`🏭 Production: ${environment.production}`);

    // Empieza a despertar el backend (plan gratuito de Render) en cuanto se crea el servicio
    this.ensureAwake().subscribe();
  }

  // ---------------------------------------------------------------------------
  // Despertar el backend de Render.
  // En el plan gratuito el servidor se duerme tras un rato sin tráfico y tarda ~50 s
  // en responder. Con timeout(10000) la primera petición fallaba y la app mostraba
  // datos SIMULADOS sin avisar. Ahora todas las peticiones esperan a que /health
  // responda (máx. 70 s) y solo después aplican su timeout normal de 10 s.
  // ---------------------------------------------------------------------------
  private warmup$?: Observable<unknown>;
  private warmupAt = 0;

  private ensureAwake(): Observable<unknown> {
    const fresh = !!this.warmup$ && Date.now() - this.warmupAt < 10 * 60 * 1000;
    if (!fresh) {
      const root = this.backendUrl.replace(/\/api\/?$/, '');
      this.warmupAt = Date.now();
      this.warmup$ = this.http.get(`${root}/health`).pipe(
        timeout(70000),
        catchError(() => of(null)), // si falla, seguimos igualmente
        shareReplay(1)
      );
    }
    return this.warmup$!;
  }

  /**
   * Devuelve el símbolo de Yahoo (p. ej. 'ACERINOX' -> 'ACX.MC').
   * Si no está en el mapa, devuelve el valor recibido.
   */
  getTicker(name: string): string {
    return this.symbolMap[name] || name;
  }

  /**
   * Obtener cotización usando backend propio
   */
  getQuote(symbol: string): Observable<any> {
    if (!environment.yahooFinance?.enabled) {
      return throwError(() => new Error('Yahoo Finance deshabilitada'));
    }

    const ticker = this.symbolMap[symbol] || symbol;
    const url = `${this.backendUrl}/quote/${ticker}`;
    
    console.log(`📊 GET ${url}`);
    
    return this.ensureAwake().pipe(
      switchMap(() => this.http.get(url, { responseType: 'json' }).pipe(timeout(10000))),
      map((data: any) => {
        console.log(`✅ ${ticker}: ${data.c}`);
        return data;
      }),
      catchError(error => {
        console.error(`❌ Error ${ticker}:`, error);
        return throwError(() => new Error(`No se pudo obtener datos de ${symbol}`));
      })
    );
  }

  /**
   * Obtener datos de índice usando backend
   */
  getIndex(symbol: string): Observable<any> {
    if (!environment.yahooFinance?.enabled) {
      return throwError(() => new Error('Yahoo Finance deshabilitada'));
    }

    const ticker = this.symbolMap[symbol] || symbol;
    const url = `${this.backendUrl}/index/${ticker}`;
    
    console.log(`📈 GET ${url}`);
    
    return this.ensureAwake().pipe(
      switchMap(() => this.http.get(url, { responseType: 'json' }).pipe(timeout(10000))),
      map((data: any) => data),
      catchError(error => {
        console.error(`❌ Error índice ${ticker}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Convertir respuesta al formato de la app
   */
  convertToStockData(symbol: string, quote: any): any {
    return {
      symbol,
      name: symbol,
      price: quote.c,
      change: quote.d,
      changePercent: quote.dp,
      volume: this.formatVolume(quote.volume),
      previousClose: quote.pc,
      dayHigh: quote.h,
      dayLow: quote.l,
      time: new Date(quote.t * 1000).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }

  /**
   * Formatear volumen
   */
  private formatVolume(volume: number): string {
    if (volume >= 1000000) return Math.floor(volume / 1000000) + 'M';
    if (volume >= 1000) return Math.floor(volume / 1000) + 'K';
    return volume.toString();
  }

  /**
   * Verificar si está configurado
   */
  isConfigured(): boolean {
    return environment.yahooFinance?.enabled === true;
  }
}