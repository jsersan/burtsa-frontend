import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MarketDataService, StockData, IndexData } from '../../services/market-data.service';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-market-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './market-view.component.html',
  styleUrls: ['./market-view.component.scss']
})
export class MarketViewComponent implements OnInit, OnDestroy {
  marketType: 'ibex35' | 'continuo' = 'ibex35';
  indexData: IndexData | null = null;
  stocks: StockData[] = [];
  topGainers: StockData[] = [];
  topLosers: StockData[] = [];
  loading = true;
  lastUpdateTime: string = '';
  private destroy$ = new Subject<void>();
  
  // Variables de ordenamiento
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  // Exponer Math para usar en el template
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private marketDataService: MarketDataService
  ) {}

  ngOnInit() {
    this.route.data
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.marketType = data['market'];
        this.loadMarketData();
      });

    // Actualizar datos cada minuto
    setInterval(() => this.loadMarketData(), 60000);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMarketData() {
    this.loading = true;

    if (this.marketType === 'ibex35') {
      this.marketDataService.getIBEX35Data()
        .pipe(takeUntil(this.destroy$))
        .subscribe(data => {
          this.indexData = data;
          this.updateLastUpdateTime();
        });

      this.marketDataService.getIBEX35Stocks()
        .pipe(takeUntil(this.destroy$))
        .subscribe(stocks => {
          // Ordenar alfabéticamente por nombre por defecto
          this.stocks = stocks.sort((a, b) => a.name.localeCompare(b.name));
          this.calculateTopMovers();
          this.loading = false;
          this.updateLastUpdateTime();
          
          // Aplicar ordenamiento si había uno activo
          if (this.sortColumn) {
            this.sortStocks();
          }
        });
    } else {
      this.marketDataService.getMercadoContinuoStocks()
        .pipe(takeUntil(this.destroy$))
        .subscribe(stocks => {
          // Ordenar alfabéticamente por nombre por defecto
          this.stocks = stocks.sort((a, b) => a.name.localeCompare(b.name));
          this.calculateTopMovers();
          this.loading = false;
          this.updateLastUpdateTime();
          
          // Aplicar ordenamiento si había uno activo
          if (this.sortColumn) {
            this.sortStocks();
          }
        });
    }
  }

  /**
   * Actualizar hora de última actualización
   */
  private updateLastUpdateTime() {
    const now = new Date();
    this.lastUpdateTime = now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  calculateTopMovers() {
    const sorted = [...this.stocks].sort((a, b) => b.changePercent - a.changePercent);
    this.topGainers = sorted.slice(0, 5);
    this.topLosers = sorted.slice(-5).reverse();
  }

  /**
   * Ordenar tabla por columna
   */
  sortBy(column: string) {
    if (this.sortColumn === column) {
      // Misma columna: alternar dirección
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Nueva columna: descendente por defecto
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }
    
    this.sortStocks();
  }

  /**
   * Aplicar ordenamiento al array de stocks
   */
  private sortStocks() {
    this.stocks.sort((a: any, b: any) => {
      let aVal = a[this.sortColumn];
      let bVal = b[this.sortColumn];
      
      // Manejo especial para strings (nombre)
      if (this.sortColumn === 'name') {
        const comparison = aVal.localeCompare(bVal);
        return this.sortDirection === 'desc' ? -comparison : comparison;
      }
      
      // Manejo especial para hora (string)
      if (this.sortColumn === 'time') {
        const comparison = aVal.localeCompare(bVal);
        return this.sortDirection === 'desc' ? -comparison : comparison;
      }
      
      // Manejo especial para volumen (puede tener K, M)
      if (this.sortColumn === 'volume') {
        aVal = this.parseVolume(aVal);
        bVal = this.parseVolume(bVal);
      }
      
      // Ordenamiento numérico
      if (this.sortDirection === 'desc') {
        return bVal - aVal; // Mayor a menor
      } else {
        return aVal - bVal; // Menor a mayor
      }
    });
  }

  /**
   * Convertir volumen (con K, M) a número
   */
  private parseVolume(volume: string): number {
    if (typeof volume === 'number') return volume;
    
    const str = volume.toString().toUpperCase();
    
    if (str.includes('M')) {
      return parseFloat(str.replace('M', '')) * 1000000;
    } else if (str.includes('K')) {
      return parseFloat(str.replace('K', '')) * 1000;
    }
    
    return parseFloat(str) || 0;
  }

  /**
   * Obtener icono de ordenamiento para una columna
   */
  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'desc' ? '▼' : '▲';
  }

  /**
   * Verificar si una columna está activa
   */
  isSortedBy(column: string): boolean {
    return this.sortColumn === column;
  }

  navigateToMarket(market: string) {
    if (market === 'ibex35') {
      this.router.navigate(['/ibex35']);
    } else {
      this.router.navigate(['/mercado-continuo']);
    }
  }

  navigateToStock(symbol: string) {
    this.router.navigate(['/stock', symbol]);
  }

  navigateToPortfolio() {
    this.router.navigate(['/portfolio']);
  }

  navigateToEuribor() {
    this.router.navigate(['/euribor']);
  }

  /**
   * Formatear número con separador de miles
   */
  formatNumber(num: number, decimals: number = 2): string {
    // Convertir a número con decimales fijos
    const fixed = num.toFixed(decimals);
    
    // Separar parte entera y decimal
    const [integer, decimal] = fixed.split('.');
    
    // Añadir separador de miles (punto) a la parte entera
    const withThousands = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    // Unir con coma decimal
    return decimal ? `${withThousands},${decimal}` : withThousands;
  }

  getChangeClass(change: number): string {
    return change >= 0 ? 'positive' : 'negative';
  }

  getChangeIcon(change: number): string {
    return change >= 0 ? '▲' : '▼';
  }
}