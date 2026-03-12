import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MarketDataService, StockData } from '../../services/market-data.service';
import { AuthService } from '../../services/auth.service';
import { PortfolioService } from '../../services/portfolio.service';
import { TechnicalIndicatorsComponent } from '../technical-indicators/technical-indicators.component';
import { PriceData } from '../../services/technical-indicators.service';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-stock-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TechnicalIndicatorsComponent],
  templateUrl: './stock-detail.component.html',
  styleUrls: ['./stock-detail.component.scss']
})
export class StockDetailComponent implements OnInit, OnDestroy {
  stock: StockData | null = null;
  stockSymbol: string = '';
  loading = true;

  operationType: 'buy' | 'sell' = 'buy';
  quantity: number = 1;
  totalAmount: number = 0;

  userPosition: any = null;
  availableCash: number = 0;
  remainingCash: number = 0;

  // NUEVAS propiedades para indicadores técnicos
  priceHistory: PriceData[] = [];
  loadingIndicators = false;
  private backendUrl = 'http://localhost:3000/api'; // Cambiar según environment

  private companyWebsites: { [key: string]: string } = {
    ACCIONA: 'https://www.acciona.com',
    'ACCIONA ENERGÍA': 'https://www.acciona-energia.com',
    ACERINOX: 'https://www.acerinox.com',
    'ACS CONST.': 'https://www.grupoacs.com',
    AENA: 'https://www.aena.es',
    'AMADEUS IT': 'https://www.amadeus.com',
    'ARCEL.MITTAL': 'https://www.arcelormittal.com',
    BANKINTER: 'https://www.bankinter.com',
    BBVA: 'https://www.bbva.com',
    CAIXABANK: 'https://www.caixabank.com',
    'CELLNEX TEL.': 'https://www.cellnextelecom.com',
    COLONIAL: 'https://www.inmocolonial.com',
    ENAGAS: 'https://www.enagas.es',
    ENDESA: 'https://www.endesa.com',
    'FERROVIAL INTL RG': 'https://www.ferrovial.com',
    FLUIDRA: 'https://www.fluidra.com',
    GRIFOLS: 'https://www.grifols.com',
    'IAG (IBERIA)': 'https://www.iairgroup.com',
    IBERDROLA: 'https://www.iberdrola.com',
    'INDRA A': 'https://www.indracompany.com',
    INDITEX: 'https://www.inditex.com',
    'LABORAT.ROVI': 'https://www.rovi.es',
    LOGISTA: 'https://www.logista.com',
    MAPFRE: 'https://www.mapfre.com',
    'MERLIN PROP.': 'https://www.merlinproperties.com',
    NATURGY: 'https://www.naturgy.com',
    'PUIG BRANDS S RG': 'https://www.puig.com',
    'REDEIA CORPORACIÓN': 'https://www.redeia.com',
    REPSOL: 'https://www.repsol.com',
    'B.SABADELL': 'https://www.bancsabadell.com',
    SACYR: 'https://www.sacyr.com',
    SANTANDER: 'https://www.santander.com',
    SOLARIA: 'https://www.solariaenergia.com',
    TELEFONICA: 'https://www.telefonica.com',
    'UNICAJA BANCO': 'https://www.unicajabanco.com'
  };

  private destroy$ = new Subject<void>();
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private marketDataService: MarketDataService,
    private authService: AuthService,
    private portfolioService: PortfolioService
  ) {}

  ngOnInit() {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.stockSymbol = params['symbol'];
      this.loadStockData();
      this.loadUserData();
      this.loadPriceHistory(); // NUEVO
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStockData() {
    this.loading = true;
    this.marketDataService
      .getStockData(this.stockSymbol)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.stock = data;
          this.calculateTotal();
          this.loading = false;
        },
        error: error => {
          console.error('Error loading stock data:', error);
          this.loading = false;
        }
      });
  }

  async loadUserData() {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    try {
      this.userPosition = await this.portfolioService.getStockPosition(
        user.uid,
        this.stockSymbol
      );

      const portfolio = await this.portfolioService.getPortfolio(user.uid);
      if (portfolio) {
        this.availableCash = portfolio.cash;
        this.calculateRemainingCash();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  /**
   * NUEVO: Cargar histórico para indicadores técnicos
   */
  async loadPriceHistory() {
    this.loadingIndicators = true;
    
    try {
      console.log(`📊 Cargando histórico de ${this.stockSymbol}...`);
      
      const url = `${this.backendUrl}/stock/${this.stockSymbol}/history?days=200`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.history) {
        this.priceHistory = data.history;
        console.log(`✅ Histórico cargado: ${data.dataPoints} días (${data.source})`);
      } else {
        throw new Error('Datos inválidos');
      }
      
    } catch (error) {
      console.error('❌ Error cargando histórico:', error);
      console.log('⚠️ Usando datos simulados en frontend');
      this.priceHistory = this.generateFallbackData();
    } finally {
      this.loadingIndicators = false;
    }
  }

  /**
   * Generar datos de fallback si el backend no responde
   */
  private generateFallbackData(): PriceData[] {
    const data: PriceData[] = [];
    let price = this.stock?.price || 50;
    
    for (let i = 200; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      price += (Math.random() - 0.5) * price * 0.02;
      
      data.push({
        date: date.toISOString().split('T')[0],
        open: price * 0.998,
        high: price * 1.005,
        low: price * 0.995,
        close: price,
        volume: Math.floor(Math.random() * 1000000) + 500000
      });
    }
    
    return data;
  }

  calculateTotal() {
    if (this.stock) {
      this.totalAmount = this.stock.price * this.quantity;
      this.calculateRemainingCash();
    }
  }

  calculateRemainingCash() {
    if (this.operationType === 'buy') {
      this.remainingCash = this.availableCash - this.totalAmount;
    } else {
      this.remainingCash = this.availableCash + this.totalAmount;
    }
  }

  onQuantityChange() {
    if (this.quantity < 1) {
      this.quantity = 1;
    }
    this.calculateTotal();
  }

  onOperationTypeChange() {
    this.calculateRemainingCash();
  }

  hasEnoughCash(): boolean {
    return this.operationType === 'sell' || this.remainingCash >= 0;
  }

  async simulateOperation() {
    if (!this.stock || this.quantity < 1) return;

    const user = this.authService.getCurrentUser();
    if (!user) {
      const result = await Swal.fire({
        title: 'Sesión requerida',
        text: 'Debes iniciar sesión para realizar operaciones',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Ir a login',
        cancelButtonText: 'Cancelar',
        customClass: {
          confirmButton: 'swal-confirm-btn',
          cancelButton: 'swal-cancel-btn'
        },
        buttonsStyling: false
      });

      if (result.isConfirmed) {
        this.router.navigate(['/login']);
      }
      return;
    }

    const confirmMessage = this.operationType === 'buy'
      ? `<div style="text-align: center;">
           <div style="font-size: 18px; margin-bottom: 15px;">
             <strong style="color: #2c7a7b;">COMPRA</strong>
           </div>
           <div style="font-size: 16px; color: #6b7280; margin-bottom: 10px;">
             ${this.quantity} acciones de <strong>${this.stock.name}</strong>
           </div>
           <div style="font-size: 28px; color: #2c7a7b; font-weight: bold; margin-top: 15px;">
             ${this.formatNumber(this.totalAmount, 2)}€
           </div>
         </div>`
      : `<div style="text-align: center;">
           <div style="font-size: 18px; margin-bottom: 15px;">
             <strong style="color: #dc2626;">VENTA</strong>
           </div>
           <div style="font-size: 16px; color: #6b7280; margin-bottom: 10px;">
             ${this.quantity} acciones de <strong>${this.stock.name}</strong>
           </div>
           <div style="font-size: 28px; color: #10b981; font-weight: bold; margin-top: 15px;">
             ${this.formatNumber(this.totalAmount, 2)}€
           </div>
         </div>`;

    const result = await Swal.fire({
      title: '¿Confirmar operación?',
      html: confirmMessage,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: {
        confirmButton: 'swal-confirm-btn',
        cancelButton: 'swal-cancel-btn'
      },
      buttonsStyling: false
    });

    if (!result.isConfirmed) return;

    try {
      this.loading = true;

      if (this.operationType === 'buy') {
        await this.portfolioService.buyStock(
          this.stockSymbol,
          this.stock.name,
          this.quantity,
          this.stock.price,
          `Compra desde detalle - ${new Date().toLocaleDateString()}`
        );

        const updatedPosition = await this.portfolioService.getStockPosition(user.uid, this.stockSymbol);
        
        if (!updatedPosition) {
          throw new Error('⚠️ Error: La compra no se guardó correctamente en tu cartera. Intenta de nuevo.');
        }

        Swal.fire({
          icon: 'success',
          title: '¡Compra realizada!',
          html: `<div style="font-size: 16px;">
                   ${this.quantity} acciones de <strong>${this.stock.name}</strong><br>
                   Total: <strong style="color: #2c7a7b;">${this.formatNumber(this.totalAmount, 2)}€</strong>
                 </div>`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true
        });
      } else {
        await this.portfolioService.sellStock(
          this.stockSymbol,
          this.stock.name,
          this.quantity,
          this.stock.price,
          `Venta desde detalle - ${new Date().toLocaleDateString()}`
        );

        Swal.fire({
          icon: 'success',
          title: '¡Venta realizada!',
          html: `<div style="font-size: 16px;">
                   ${this.quantity} acciones de <strong>${this.stock.name}</strong><br>
                   Total: <strong style="color: #10b981;">${this.formatNumber(this.totalAmount, 2)}€</strong>
                 </div>`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true
        });
      }

      this.router.navigate(['/portfolio']);
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error en la operación',
        text: error.message || 'No se pudo completar la operación',
        confirmButtonText: 'Entendido',
        customClass: {
          confirmButton: 'swal-confirm-btn'
        },
        buttonsStyling: false
      });
    } finally {
      this.loading = false;
    }
  }

  goToCompanyWebsite() {
    if (!this.stock) return;

    const website = this.companyWebsites[this.stock.name];
    if (website) {
      window.open(website, '_blank');
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Website no disponible',
        text: 'No tenemos el sitio web registrado para esta empresa',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    }
  }

  goToPortfolio() {
    this.router.navigate(['/portfolio']);
  }

  goBack() {
    this.router.navigate(['/ibex35']);
  }

  formatNumber(num: number, decimals: number = 2): string {
    const fixed = num.toFixed(decimals);
    const [integer, decimal] = fixed.split('.');
    const withThousands = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decimal ? `${withThousands},${decimal}` : withThousands;
  }

  getChangeClass(change: number): string {
    return change >= 0 ? 'positive' : 'negative';
  }

  getChangeIcon(change: number): string {
    return change >= 0 ? '▲' : '▼';
  }
}