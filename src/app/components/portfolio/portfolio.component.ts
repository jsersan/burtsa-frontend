import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PortfolioService, Portfolio, Transaction } from '../../services/portfolio.service';
import { MarketDataService } from '../../services/market-data.service';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.scss']
})
export class PortfolioComponent implements OnInit, OnDestroy {
  portfolio: Portfolio | null = null;
  transactions: Transaction[] = [];
  loading = true;
  userName = '';
  lastUpdateTime: string = '';
  
  private destroy$ = new Subject<void>();
  Math = Math;

  constructor(
    private authService: AuthService,
    private portfolioService: PortfolioService,
    private marketDataService: MarketDataService,
    private router: Router
  ) {}

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.userName = user.displayName || user.email || 'Usuario';
    await this.loadPortfolioData(user.uid);
    
    // Actualizar precios cada 30 segundos
    setInterval(() => this.updatePrices(user.uid), 30000);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar datos de la cartera
   */
  async loadPortfolioData(userId: string) {
    this.loading = true;

    try {
      // Cargar cartera
      this.portfolio = await this.portfolioService.getPortfolio(userId);
      
      // Cargar transacciones
      this.transactions = await this.portfolioService.getTransactions(userId, 20);
      
      // Actualizar precios actuales
      if (this.portfolio) {
        await this.updatePrices(userId);
      }
      
      // Actualizar hora de última actualización
      this.updateLastUpdateTime();
    } catch (error) {
      console.error('Error al cargar datos:', error);
      
      // Toast de error
      Swal.fire({
        icon: 'error',
        title: 'Error al cargar datos',
        text: 'No se pudo cargar tu cartera. Intenta recargar la página.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true
      });
    } finally {
      this.loading = false;
    }
  }

  /**
   * Actualizar precios actuales de las acciones
   */
  async updatePrices(userId: string) {
    if (!this.portfolio) return;

    const symbols = Object.keys(this.portfolio.stocks);
    if (symbols.length === 0) return;

    try {
      const currentPrices: { [symbol: string]: number } = {};

      // Obtener precio actual de cada acción
      for (const symbol of symbols) {
        this.marketDataService.getStockData(symbol)
          .pipe(takeUntil(this.destroy$))
          .subscribe(stock => {
            currentPrices[symbol] = stock.price;
          });
      }

      // Esperar un momento para que se carguen los precios
      setTimeout(async () => {
        await this.portfolioService.updatePortfolioPrices(userId, currentPrices);
        this.portfolio = await this.portfolioService.getPortfolio(userId);
        this.updateLastUpdateTime();
      }, 1000);
    } catch (error) {
      console.error('Error al actualizar precios:', error);
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

  /**
   * Navegar a gestión de efectivo
   */
  manageCash() {
    this.router.navigate(['/cash-management']);
  }

  /**
   * Navegar al detalle de una acción
   */
  goToStock(symbol: string) {
    this.router.navigate(['/stock', symbol]);
  }

  /**
   * Navegar al mercado
   */
  goToMarket() {
    this.router.navigate(['/ibex35']);
  }

  /**
   * Cerrar sesión con confirmación
   */
  async logout() {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: '¿Estás seguro de que quieres salir?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: {
        confirmButton: 'swal-confirm-btn',
        cancelButton: 'swal-cancel-btn'
      },
      buttonsStyling: false
    });

    if (result.isConfirmed) {
      try {
        await this.authService.logout();
        
        // Toast de éxito
        Swal.fire({
          icon: 'success',
          title: '¡Hasta pronto!',
          text: 'Sesión cerrada correctamente',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true
        });
        
        this.router.navigate(['/login']);
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cerrar la sesión. Intenta de nuevo.',
          confirmButtonText: 'Entendido',
          customClass: {
            confirmButton: 'swal-confirm-btn'
          },
          buttonsStyling: false
        });
      }
    }
  }

  /**
   * Obtener array de acciones
   */
  getStocksArray() {
    if (!this.portfolio) return [];
    return Object.values(this.portfolio.stocks);
  }

  /**
   * Formatear número con separador de miles
   */
  formatNumber(num: number, decimals: number = 2): string {
    const fixed = num.toFixed(decimals);
    const [integer, decimal] = fixed.split('.');
    const withThousands = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decimal ? `${withThousands},${decimal}` : withThousands;
  }

  /**
   * Formatear fecha
   */
  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Clase CSS según ganancia/pérdida
   */
  getChangeClass(value: number): string {
    return value >= 0 ? 'positive' : 'negative';
  }

  /**
   * Icono según tipo de operación
   */
  getTransactionIcon(type: 'buy' | 'sell'): string {
    return type === 'buy' ? '📈' : '📉';
  }

  /**
   * Clase CSS según tipo de operación
   */
  getTransactionClass(type: 'buy' | 'sell'): string {
    return type === 'buy' ? 'buy-transaction' : 'sell-transaction';
  }
}