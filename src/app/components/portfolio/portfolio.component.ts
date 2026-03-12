import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PortfolioService, Portfolio, Transaction } from '../../services/portfolio.service';
import { MarketDataService } from '../../services/market-data.service';
import { EuriborService } from '../../services/euribor.service';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.scss']
})
export class PortfolioComponent implements OnInit, OnDestroy {
  portfolio: Portfolio | null = null;
  transactions: Transaction[] = [];
  loading = true;
  userName = '';
  lastUpdateTime: string = '';
  
  // Variables Euribor
  euriborRate: number = 0;
  euriborDate: string = '';
  euriborChange: number = 0;
  
  // Variables calculadora hipoteca
  capitalPendiente: number | null = null;
  fechaFinalizacion: string = '';
  diferencial: number = 0.50;
  tipoInteres: number = 0;
  cuotaMensual: number = 0;
  plazoMeses: number = 0;
  interesesTotales: number = 0;
  totalAPagar: number = 0;
  
  private destroy$ = new Subject<void>();
  Math = Math;

  constructor(
    private authService: AuthService,
    private portfolioService: PortfolioService,
    private marketDataService: MarketDataService,
    private euriborService: EuriborService,
    private router: Router
  ) {}

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.userName = user.displayName || user.email || 'Usuario';
    
    // Cargar datos del portfolio Y del Euribor
    await Promise.all([
      this.loadPortfolioData(user.uid),
      this.loadEuriborData()
    ]);
    
    // Actualizar precios cada 30 segundos
    setInterval(() => this.updatePrices(user.uid), 30000);
    
    // Actualizar Euribor cada 5 minutos
    setInterval(() => this.loadEuriborData(), 300000);
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
   * Cargar datos del Euribor
   */
  async loadEuriborData() {
    try {
      const data = await this.euriborService.getCurrentEuribor();
      
      this.euriborRate = data.rate;
      this.euriborDate = data.date;
      this.euriborChange = data.change;
      
      // Actualizar tipo de interés en la calculadora
      this.tipoInteres = this.euriborRate + this.diferencial;
      
      // Recalcular si hay datos
      if (this.capitalPendiente && this.fechaFinalizacion) {
        this.calcularCuota();
      }
      
      console.log('✅ Euribor cargado:', this.euriborRate + '%');
    } catch (error) {
      console.error('Error al cargar Euribor:', error);
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
   * ============================================
   * MÉTODOS DE LA CALCULADORA DE HIPOTECA
   * ============================================
   */

  /**
   * Calcular plazo en meses (diferencia exacta de meses)
   */
  calcularPlazo(): number {
    if (!this.fechaFinalizacion) return 0;

    const hoy = new Date();
    const fechaFin = new Date(this.fechaFinalizacion);
    
    // Calcular diferencia exacta de meses
    let meses = (fechaFin.getFullYear() - hoy.getFullYear()) * 12 
              + (fechaFin.getMonth() - hoy.getMonth());
    
    // Ajustar si el día de finalización es anterior al día actual
    if (fechaFin.getDate() < hoy.getDate()) {
      meses--;
    }
    
    return meses > 0 ? meses : 0;
  }

  /**
   * Calcular cuota mensual con sistema francés
   */
  calcularCuota() {
    if (!this.capitalPendiente || !this.fechaFinalizacion || this.capitalPendiente <= 0) {
      this.resetCalculation();
      return;
    }

    this.plazoMeses = this.calcularPlazo();
    
    if (this.plazoMeses <= 0) {
      this.resetCalculation();
      return;
    }

    // Actualizar tipo de interés total
    this.tipoInteres = this.euriborRate + this.diferencial;
    
    // Interés mensual
    const interesMensual = this.tipoInteres / 100 / 12;
    
    // Sistema Francés: C = P * [i(1+i)^n] / [(1+i)^n - 1]
    const factor = Math.pow(1 + interesMensual, this.plazoMeses);
    this.cuotaMensual = this.capitalPendiente * (interesMensual * factor) / (factor - 1);
    
    // Calcular totales
    this.totalAPagar = this.cuotaMensual * this.plazoMeses;
    this.interesesTotales = this.totalAPagar - this.capitalPendiente;
  }

  /**
   * Resetear cálculos
   */
  private resetCalculation() {
    this.cuotaMensual = 0;
    this.plazoMeses = 0;
    this.interesesTotales = 0;
    this.totalAPagar = 0;
  }

  /**
   * Actualizar diferencial y recalcular
   */
  onDiferencialChange() {
    if (this.diferencial < 0) {
      this.diferencial = 0;
    }
    this.tipoInteres = this.euriborRate + this.diferencial;
    this.calcularCuota();
  }

  /**
   * ============================================
   * MÉTODOS DE NAVEGACIÓN
   * ============================================
   */

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
   * ============================================
   * MÉTODOS DE UTILIDAD
   * ============================================
   */

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
    if (!num && num !== 0) return '0,00';
    
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
   * Formatear fecha del Euribor
   */
  formatEuriborDate(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Clase CSS según ganancia/pérdida
   */
  getChangeClass(value: number): string {
    return value >= 0 ? 'positive' : 'negative';
  }

  /**
   * Icono según cambio
   */
  getChangeIcon(change: number): string {
    return change >= 0 ? '▲' : '▼';
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