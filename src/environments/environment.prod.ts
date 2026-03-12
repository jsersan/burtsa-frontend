export const environment = {
  production: true,
  
  yahooFinance: {
    enabled: true,
    backendUrl: 'http://localhost:3000/api'
  },
  
  // Finnhub (deshabilitado en producción)
  finnhub: {
    key: '',
    enabled: false
  },
  
  useMockData: false,
  activeAPI: 'yahooFinance'
};