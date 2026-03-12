import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface EuriborData {
  rate: number;
  date: string;
  change: number;
}

@Injectable({
  providedIn: 'root'
})
export class EuriborService {
  // URL de tu backend (compatible con yahoo-finance backend)
  private backendUrl = environment.production 
    ? 'https://backend-yahoo.onrender.com/api'  // Producción
    : 'http://localhost:3000/api';              // Desarrollo
  
  constructor(private http: HttpClient) {
    console.log('🔧 EuriborService inicializado');
    console.log('📡 Backend URL:', this.backendUrl);
  }

  /**
   * Obtener Euribor actual a 1 año desde tu backend
   */
  async getCurrentEuribor(): Promise<EuriborData> {
    try {
      console.log('📊 Obteniendo Euribor desde backend...');
      
      // Intentar obtener datos reales del backend
      const response = await this.http.get<any>(`${this.backendUrl}/euribor/current`).toPromise();
      
      if (response && response.rate) {
        console.log('✅ Euribor obtenido:', response.rate + '%');
        return {
          rate: response.rate,
          date: response.date,
          change: response.change
        };
      }
      
      throw new Error('Respuesta inválida del backend');
    } catch (error) {
      console.warn('⚠️ Backend no disponible, usando datos simulados');
      console.error('Error:', error);
      return this.getMockEuriborData();
    }
  }

  /**
   * Obtener histórico de Euribor desde tu backend
   */
  async getHistorico(days: number = 30): Promise<EuriborData[]> {
    try {
      console.log(`📅 Obteniendo histórico de ${days} días...`);
      
      // Intentar obtener datos reales del backend
      const response = await this.http.get<any[]>(`${this.backendUrl}/euribor/historico?days=${days}`).toPromise();
      
      if (response && Array.isArray(response) && response.length > 0) {
        console.log(`✅ Histórico obtenido: ${response.length} registros`);
        return response;
      }
      
      throw new Error('Respuesta inválida del backend');
    } catch (error) {
      console.warn('⚠️ Backend no disponible, usando datos simulados');
      return this.getMockHistorico(days);
    }
  }

  /**
   * Datos simulados del Euribor (valores realistas de marzo 2026)
   * 
   * NOTA: Estos son datos de ejemplo. Para producción, necesitas:
   * 1. Conectar a una API real del Euribor
   * 2. O hacer scraping de sitios oficiales
   * 3. O usar servicios como Financial Modeling Prep
   */
  private getMockEuriborData(): EuriborData {
    // Simular valor realista del Euribor a 1 año para marzo 2026
    // (tendencia bajista desde máximos de 2023)
    const baseRate = 2.856; // Valor simulado realista
    const randomVariation = (Math.random() - 0.5) * 0.05; // ±0.025%
    const rate = baseRate + randomVariation;
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    return {
      rate: Math.round(rate * 1000) / 1000, // 3 decimales
      date: today.toISOString().split('T')[0],
      change: (Math.random() - 0.5) * 0.02 // Variación diaria pequeña
    };
  }

  /**
   * Generar histórico simulado
   */
  private getMockHistorico(days: number): EuriborData[] {
    const historico: EuriborData[] = [];
    const today = new Date();
    let currentRate = 2.856; // Base realista
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Simular pequeñas variaciones diarias (-0.03% a +0.03%)
      const change = (Math.random() - 0.5) * 0.06;
      currentRate += change;
      
      // Mantener en rango realista (2.5% - 3.5%)
      currentRate = Math.max(2.5, Math.min(3.5, currentRate));
      
      historico.push({
        rate: Math.round(currentRate * 1000) / 1000,
        date: date.toISOString().split('T')[0],
        change: Math.round(change * 1000) / 1000
      });
    }
    
    return historico;
  }

  /**
   * IMPLEMENTACIÓN REAL CON BANCO DE ESPAÑA
   * 
   * Descomenta esto cuando quieras conectar con datos reales:
   */
  /*
  async getRealEuriborFromBdE(): Promise<EuriborData> {
    try {
      // API del Banco de España
      const url = 'https://serviciosede.bde.es/series/v1.0/valores/TI_1_1_1';
      
      const response = await this.http.get<any>(url, {
        headers: {
          'Accept': 'application/json'
        }
      }).toPromise();
      
      // Procesar respuesta del Banco de España
      const lastValue = response.Observations[response.Observations.length - 1];
      const previousValue = response.Observations[response.Observations.length - 2];
      
      return {
        rate: parseFloat(lastValue.Value),
        date: lastValue.Date,
        change: parseFloat(lastValue.Value) - parseFloat(previousValue.Value)
      };
    } catch (error) {
      console.error('Error con Banco de España:', error);
      return this.getMockEuriborData();
    }
  }
  */

  /**
   * IMPLEMENTACIÓN ALTERNATIVA CON WEB SCRAPING
   * 
   * Puedes crear un pequeño backend en Node.js que haga scraping de:
   * - https://www.euribor-rates.eu/es/
   * - https://www.euribor.com.es/
   * 
   * Y exponer los datos via API REST
   */
}