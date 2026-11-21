// Configuración de APIs para datos bursátiles
// NO SUBAS ESTE ARCHIVO A REPOSITORIOS PÚBLICOS (ya está en .gitignore)

export const environment = {
  production: false,
  
  // Yahoo Finance (sin API key necesaria)
  yahooFinance: {
    enabled: true,
    backendUrl: 'http://localhost:3000/api'  // ← Desarrollo
  },
  
  // Finnhub (alternativa - requiere API key)
  finnhub: {
    key: '',  // Opcional: pega tu Finnhub API key aquí
    enabled: false
  },
  
  // Control de datos
  useMockData: false,  // ← IMPORTANTE: Mantén esto en true inicialmente
  activeAPI: 'yahooFinance'
};