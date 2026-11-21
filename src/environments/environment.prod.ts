export const environment = {
  production: true,
  
  yahooFinance: {
    enabled: true,
    backendUrl: 'https://backend-yahoo.onrender.com/api'
  },
  
  // Finnhub (deshabilitado en producción)
  finnhub: {
    key: '',
    enabled: false
  },
  
  useMockData: false,
  activeAPI: 'yahooFinance'
};