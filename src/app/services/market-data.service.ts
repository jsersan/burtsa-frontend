import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { YahooFinanceService } from './yahoo-finance.service'; // ⭐ CORREGIDO: añadido .service

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  time: string;
}

export interface IndexData {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class MarketDataService {

  constructor(
    private http: HttpClient,
    private yahooFinanceService: YahooFinanceService
  ) {}

  /**
   * Obtiene datos del IBEX 35
   */
  getIBEX35Data(): Observable<IndexData> {
    // Si useMockData está activado, devolver datos simulados
    if (environment.useMockData) {
      console.log('📊 Usando datos simulados para IBEX 35');
      return of(this.getMockIndexData());
    }

    // Si Yahoo Finance está habilitado
    if (environment.yahooFinance?.enabled && this.yahooFinanceService.isConfigured()) {
      console.log('🌐 Obteniendo IBEX 35 desde Yahoo Finance...');
      // ⭐ CORREGIDO: usando getIndex en lugar de getQuote
      return this.yahooFinanceService.getIndex('^IBEX').pipe(
        map((data: any) => ({
          name: 'IBEX 35',
          value: data.value,
          change: data.change,
          changePercent: data.changePercent,
          timestamp: data.timestamp
        })),
        catchError(error => {
          console.warn('⚠️ Error obteniendo IBEX 35, usando datos simulados:', error);
          return of(this.getMockIndexData());
        })
      );
    }

    // Fallback a datos simulados
    console.warn('⚠️ No API configured, using mock data');
    return of(this.getMockIndexData());
  }

  /**
   * Obtiene datos de todas las acciones del IBEX 35
   */
  getIBEX35Stocks(): Observable<StockData[]> {
    const ibexStocks = [
      'AMADEUS IT', 'ACERINOX', 'INDRA A', 'ARCEL.MITTAL', 'SOLARIA',
      'REPSOL', 'ENAGAS', 'LABORAT.ROVI', 'REDEIA CORPORACIÓN', 
      'FERROVIAL INTL RG', 'ACCIONA', 'ACCIONA ENERGÍA', 'ACS CONST.',
      'AENA', 'B.SABADELL', 'BANKINTER', 'BBVA', 'CAIXABANK',
      'CELLNEX TEL.', 'COLONIAL', 'ENDESA', 'FLUIDRA', 'GRIFOLS',
      'IAG (IBERIA)', 'IBERDROLA', 'INDITEX', 'LOGISTA', 'MAPFRE',
      'MERLIN PROP.', 'NATURGY', 'PUIG BRANDS S RG', 'SANTANDER',
      'SACYR', 'TELEFONICA', 'UNICAJA BANCO'
    ];

    return this.getStocksData(ibexStocks, 'IBEX 35');
  }

  /**
   * Obtiene datos del Mercado Continuo
   */
  getMercadoContinuoStocks(): Observable<StockData[]> {
    const continuoStocks = [
      // IBEX 35
      'ACCIONA', 'ACCIONA ENERGÍA', 'ACERINOX', 'ACS CONST.', 'AENA',
      'AMADEUS IT', 'ARCEL.MITTAL', 'B.SABADELL', 'BANKINTER', 'BBVA',
      'CAIXABANK', 'CELLNEX TEL.', 'COLONIAL', 'ENAGAS', 'ENDESA',
      'FERROVIAL INTL RG', 'FLUIDRA', 'GRIFOLS', 'IAG (IBERIA)', 'IBERDROLA',
      'INDRA A', 'INDITEX', 'LABORAT.ROVI', 'LOGISTA', 'MAPFRE',
      'MERLIN PROP.', 'NATURGY', 'PUIG BRANDS S RG', 'REDEIA CORPORACIÓN',
      'REPSOL', 'SACYR', 'SANTANDER', 'SOLARIA', 'TELEFONICA', 'UNICAJA BANCO',
      
      // Resto del Mercado Continuo (primeros 20 por rendimiento)
      'ADOLFO DMGZ', 'AEDAS HOMES', 'AIRBUS GROUP', 'AIRTIFICIAL INT.',
      'ALANTRA PART', 'ALMIRALL', 'AMPER', 'APERAM',
      'ARTECHE', 'ATRESMEDIA', 'ATRYS HEALTH', 'AUDAX REN.',
      'AZKOYEN', 'B.RIOJANAS', 'BERKELEY ENERGIA', 'C. BAVIERA',
      'CAF', 'CIE AUTOMOTIVE', 'COCA-COLA', 'DEOLEO'
    ];

    return this.getStocksData(continuoStocks, 'Mercado Continuo');
  }

  /**
   * Obtener datos de múltiples acciones
   */
  private getStocksData(symbols: string[], market: string): Observable<StockData[]> {
    // Si useMockData está activado
    if (environment.useMockData) {
      console.log(`📊 Usando datos simulados para ${market}`);
      return of(this.getMockStockData(symbols));
    }

    // Si Yahoo Finance está habilitado
    if (environment.yahooFinance?.enabled && this.yahooFinanceService.isConfigured()) {
      console.log(`🌐 Obteniendo ${market} desde Yahoo Finance...`);
      
      // Obtener datos de cada acción
      const stockObservables = symbols.map(symbol =>
        this.yahooFinanceService.getQuote(symbol).pipe(
          map(quote => this.yahooFinanceService.convertToStockData(symbol, quote)),
          catchError(error => {
            console.warn(`⚠️ Error obteniendo ${symbol}, usando datos simulados`);
            return of(this.getMockStockData([symbol])[0]);
          })
        )
      );

      // Combinar todos los observables (limitamos a 10 simultáneos para no saturar)
      return new Observable<StockData[]>(observer => {
        const results: StockData[] = [];
        let completed = 0;

        stockObservables.forEach((obs, index) => {
          setTimeout(() => {
            obs.subscribe({
              next: (data) => {
                results[index] = data;
                completed++;
                if (completed === stockObservables.length) {
                  observer.next(results.filter(r => r)); // Filtrar nulls
                  observer.complete();
                }
              },
              error: () => {
                completed++;
                if (completed === stockObservables.length) {
                  observer.next(results.filter(r => r));
                  observer.complete();
                }
              }
            });
          }, index * 100); // Escalonar peticiones cada 100ms
        });
      });
    }

    // Fallback a datos simulados
    console.warn('⚠️ No API configured, using mock data');
    return of(this.getMockStockData(symbols));
  }

  /**
   * Obtiene datos de una acción específica por su símbolo
   */
  getStockData(symbol: string): Observable<StockData> {
    // Si useMockData está activado
    if (environment.useMockData) {
      return of(this.getMockStockData([symbol])[0]);
    }

    // Si Yahoo Finance está habilitado
    if (environment.yahooFinance?.enabled && this.yahooFinanceService.isConfigured()) {
      return this.yahooFinanceService.getQuote(symbol).pipe(
        map(quote => this.yahooFinanceService.convertToStockData(symbol, quote)),
        catchError(error => {
          console.warn(`⚠️ Error obteniendo ${symbol}, usando datos simulados`);
          return of(this.getMockStockData([symbol])[0]);
        })
      );
    }
    
    // Fallback a datos simulados
    return of(this.getMockStockData([symbol])[0]);
  }

  /**
   * Formatea el volumen de forma legible
   */
  private formatVolume(volume: number): string {
    if (volume >= 1000000) {
      return Math.floor(volume / 1000000) + 'M';
    } else if (volume >= 1000) {
      return Math.floor(volume / 1000) + 'K';
    }
    return volume.toString();
  }

  /**
   * Datos simulados para desarrollo y fallback
   */
  private getMockIndexData(): IndexData {
    return {
      name: 'IBEX 35',
      value: 17074,
      change: -170,
      changePercent: -0.99,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Genera datos simulados basados en ecobolsa.com
   */
  private getMockStockData(stocks: string[]): StockData[] {
    const mockData: { [key: string]: Partial<StockData> } = {
      'ACCIONA': { price: 209.80, change: -6.20, changePercent: -2.87, volume: '88K', previousClose: 216.00, dayHigh: 217.80, dayLow: 207.20 },
      'ACCIONA ENERGÍA': { price: 19.90, change: -0.24, changePercent: -1.19, volume: '322K', previousClose: 20.14, dayHigh: 20.60, dayLow: 19.78 },
      'ACERINOX': { price: 12.42, change: -0.20, changePercent: -1.58, volume: '860K', previousClose: 12.62, dayHigh: 12.84, dayLow: 12.36 },
      'ACS CONST.': { price: 102.70, change: -2.70, changePercent: -2.56, volume: '468K', previousClose: 105.40, dayHigh: 105.80, dayLow: 100.70 },
      'AENA': { price: 25.46, change: -0.02, changePercent: -0.08, volume: '1M', previousClose: 25.48, dayHigh: 25.72, dayLow: 25.12 },
      'AMADEUS IT': { price: 54.62, change: 0.88, changePercent: 1.64, volume: '2M', previousClose: 53.74, dayHigh: 54.92, dayLow: 53.60 },
      'ARCEL.MITTAL': { price: 47.90, change: -1.51, changePercent: -3.06, volume: '403K', previousClose: 49.41, dayHigh: 50.14, dayLow: 47.70 },
      'B.SABADELL': { price: 2.99, change: -0.018, changePercent: -0.60, volume: '21M', previousClose: 3.09, dayHigh: 3.048, dayLow: 2.94 },
      'BANKINTER': { price: 13.25, change: -0.195, changePercent: -1.45, volume: '2M', previousClose: 13.45, dayHigh: 13.56, dayLow: 13.45 },
      'BBVA': { price: 18.37, change: -0.18, changePercent: -0.97, volume: '14M', previousClose: 18.55, dayHigh: 18.81, dayLow: 18.25 },
      'CAIXABANK': { price: 9.87, change: -0.175, changePercent: -1.74, volume: '10M', previousClose: 10.045, dayHigh: 10.13, dayLow: 9.706 },
      'CELLNEX TEL.': { price: 29.29, change: -0.57, changePercent: -1.91, volume: '2M', previousClose: 29.86, dayHigh: 30.40, dayLow: 28.65 },
      'COLONIAL': { price: 5.285, change: 0.005, changePercent: 0.09, volume: '2M', previousClose: 5.28, dayHigh: 5.33, dayLow: 5.26 },
      'ENAGAS': { price: 14.765, change: 0.115, changePercent: 0.78, volume: '1M', previousClose: 14.65, dayHigh: 14.845, dayLow: 14.555 },
      'ENDESA': { price: 33.26, change: 0.23, changePercent: 0.70, volume: '785K', previousClose: 33.03, dayHigh: 33.56, dayLow: 32.95 },
      'FERROVIAL INTL RG': { price: 57.06, change: -0.98, changePercent: -1.69, volume: '941K', previousClose: 58.04, dayHigh: 59.06, dayLow: 56.24 },
      'FLUIDRA': { price: 21.24, change: -0.64, changePercent: -2.93, volume: '236K', previousClose: 21.88, dayHigh: 22.06, dayLow: 21.20 },
      'GRIFOLS': { price: 10.06, change: -0.35, changePercent: -3.36, volume: '2M', previousClose: 10.41, dayHigh: 10.595, dayLow: 10.045 },
      'IAG (IBERIA)': { price: 4.21, change: -0.079, changePercent: -1.85, volume: '15M', previousClose: 4.28, dayHigh: 4.37, dayLow: 4.27 },
      'IBERDROLA': { price: 19.215, change: -0.085, changePercent: -0.44, volume: '11M', previousClose: 19.30, dayHigh: 19.455, dayLow: 19.02 },
      'INDITEX': { price: 51.88, change: -1.40, changePercent: -2.15, volume: '3M', previousClose: 53.02, dayHigh: 53.38, dayLow: 51.88 },
      'INDRA A': { price: 59.95, change: -1.90, changePercent: -3.07, volume: '927K', previousClose: 61.85, dayHigh: 63.00, dayLow: 59.55 },
      'LABORAT.ROVI': { price: 80.85, change: 0.15, changePercent: 0.19, volume: '113K', previousClose: 80.70, dayHigh: 81.05, dayLow: 79.65 },
      'LOGISTA': { price: 30.32, change: -0.18, changePercent: -0.59, volume: '249K', previousClose: 30.50, dayHigh: 30.68, dayLow: 30.08 },
      'MAPFRE': { price: 3.656, change: -0.040, changePercent: -1.08, volume: '2M', previousClose: 3.696, dayHigh: 3.738, dayLow: 3.614 },
      'MERLIN PROP.': { price: 14.22, change: -0.28, changePercent: -1.93, volume: '1M', previousClose: 14.50, dayHigh: 14.58, dayLow: 14.09 },
      'NATURGY': { price: 24.96, change: 0.44, changePercent: 1.79, volume: '2M', previousClose: 24.52, dayHigh: 25.02, dayLow: 24.66 },
      'PUIG BRANDS S RG': { price: 15.07, change: -0.17, changePercent: -1.12, volume: '584K', previousClose: 15.24, dayHigh: 15.45, dayLow: 15.06 },
      'REDEIA CORPORACIÓN': { price: 14.87, change: 0.01, changePercent: 0.07, volume: '2M', previousClose: 14.86, dayHigh: 15.02, dayLow: 14.82 },
      'REPSOL': { price: 20.76, change: 0.54, changePercent: 2.67, volume: '8M', previousClose: 20.22, dayHigh: 20.82, dayLow: 20.20 },
      'SACYR': { price: 4.158, change: -0.046, changePercent: -1.09, volume: '3M', previousClose: 4.204, dayHigh: 4.228, dayLow: 4.058 },
      'SANTANDER': { price: 9.582, change: -0.119, changePercent: -1.23, volume: '42M', previousClose: 9.701, dayHigh: 9.821, dayLow: 9.364 },
      'SOLARIA': { price: 19.32, change: -0.255, changePercent: -1.30, volume: '1M', previousClose: 19.575, dayHigh: 20.08, dayLow: 18.96 },
      'TELEFONICA': { price: 3.671, change: 0.103, changePercent: 2.89, volume: '17M', previousClose: 3.568, dayHigh: 3.671, dayLow: 3.568 },
      'UNICAJA BANCO': { price: 2.502, change: -0.030, changePercent: -1.18, volume: '7M', previousClose: 2.532, dayHigh: 2.556, dayLow: 2.462 }
    };

    return stocks.map(stock => {
      const mock = mockData[stock] || {};
      const basePrice = mock.price || Math.random() * 100 + 10;
      const changePercent = mock.changePercent || (Math.random() * 10 - 5);
      const change = mock.change || (basePrice * changePercent / 100);

      return {
        symbol: stock,
        name: stock,
        price: basePrice,
        change: change,
        changePercent: changePercent,
        volume: mock.volume || this.formatVolume(Math.floor(Math.random() * 50000000)),
        previousClose: mock.previousClose || (basePrice - change),
        dayHigh: mock.dayHigh || (basePrice + Math.abs(change) * 1.2),
        dayLow: mock.dayLow || (basePrice - Math.abs(change) * 1.2),
        time: 'CIERRE'
      };
    });
  }
}