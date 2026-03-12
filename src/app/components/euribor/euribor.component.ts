import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EuriborService } from '../../services/euribor.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-euribor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './euribor.component.html',
  styleUrls: ['./euribor.component.scss']
})
export class EuriborComponent implements OnInit {
  // Datos del Euribor
  euriborRate: number = 0;
  euriborDate: string = '';
  euriborChange: number = 0;
  loading = true;
  lastUpdateTime: string = '';

  // Datos de la calculadora
  capitalPendiente: number | null = null;
  fechaFinalizacion: string = '';
  diferencial: number = 0.50; // 0.50% por defecto
  tipoInteres: number = 0;
  cuotaMensual: number = 0;
  plazoMeses: number = 0;
  interesesTotales: number = 0;
  totalAPagar: number = 0;

  // Histórico
  historico: any[] = [];

  Math = Math;

  constructor(
    private euriborService: EuriborService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadEuriborData();
    // Actualizar cada 5 minutos
    setInterval(() => this.loadEuriborData(), 300000);
  }

  /**
   * Cargar datos del Euribor
   */
  async loadEuriborData() {
    this.loading = true;

    try {
      // Obtener Euribor actual
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

      // Obtener histórico
      this.historico = await this.euriborService.getHistorico(30);
      
      this.updateLastUpdateTime();
    } catch (error) {
      console.error('Error al cargar Euribor:', error);
      
      Swal.fire({
        icon: 'warning',
        title: 'Datos no disponibles',
        text: 'Usando datos simulados del Euribor',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    } finally {
      this.loading = false;
    }
  }

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
      Swal.fire({
        icon: 'warning',
        title: 'Fecha inválida',
        text: 'La fecha de finalización debe ser posterior a hoy',
        confirmButtonText: 'Entendido',
        customClass: {
          confirmButton: 'swal-confirm-btn'
        },
        buttonsStyling: false
      });
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
   * Navegar a cartera
   */
  goToPortfolio() {
    this.router.navigate(['/portfolio']);
  }

  /**
   * Navegar a mercado
   */
  goToMarket() {
    this.router.navigate(['/ibex35']);
  }

  /**
   * Formatear número
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
  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Clase CSS según cambio
   */
  getChangeClass(change: number): string {
    return change >= 0 ? 'positive' : 'negative';
  }

  /**
   * Icono según cambio
   */
  getChangeIcon(change: number): string {
    return change >= 0 ? '▲' : '▼';
  }
}