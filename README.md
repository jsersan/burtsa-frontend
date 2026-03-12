# Burtsa - Aplicación de Gestión de Inversiones en Bolsa

Una aplicación Angular 20 moderna para seguimiento y gestión de inversiones en el mercado de valores español.

## 🚀 Características

- **IBEX 35**: Visualización en tiempo real del índice y sus valores
- **Mercado Continuo**: Seguimiento de todos los valores del mercado continuo español
- **Datos en Tiempo Real**: Actualización automática de cotizaciones
- **Top Movers**: Visualización de las mejores y peores acciones del día
- **Interfaz Responsiva**: Diseño adaptable a móviles, tablets y escritorio
- **Diseño Moderno**: UI limpia y profesional inspirada en plataformas financieras

## 📋 Requisitos Previos

- Node.js (versión 18.19 o superior, recomendado 20.x)
- npm (versión 10 o superior)
- Angular CLI (versión 20 o superior)

## 🔧 Instalación

1. **Instalar dependencias:**
```bash
cd burtsa-app
npm install
```

2. **Configurar API de datos bursátiles:**

Por defecto, la aplicación usa datos simulados basados en las capturas de pantalla proporcionadas. Para usar datos reales, necesitas configurar una API de mercado de valores:

### Opciones de API recomendadas:

#### 1. Alpha Vantage (Gratuita)
- Regístrate en: https://www.alphavantage.co/support/#api-key
- 500 requests/día gratis
- Actualiza `src/app/services/market-data.service.ts` con tu API key

#### 2. Twelve Data (Freemium)
- Regístrate en: https://twelvedata.com/
- 800 requests/día gratis
- Excelente cobertura del mercado español

#### 3. Yahoo Finance API
- Gratuita pero con limitaciones
- No requiere API key
- Ya implementada parcialmente en el servicio

#### 4. Finnhub (Freemium)
- Regístrate en: https://finnhub.io/
- 60 requests/minuto gratis
- Buena documentación

### Configuración de API:

Edita el archivo `src/app/services/market-data.service.ts`:

```typescript
// Ejemplo para Alpha Vantage
private readonly API_KEY = 'TU_API_KEY_AQUI';
private readonly API_BASE = 'https://www.alphavantage.co/query';

getStockData(symbol: string): Observable<StockData> {
  const url = `${this.API_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.API_KEY}`;
  return this.http.get<any>(url).pipe(
    map(data => this.transformAlphaVantageData(data))
  );
}
```

## 🚀 Ejecución

### Modo desarrollo:
```bash
npm start
```
La aplicación estará disponible en `http://localhost:4200`

### Build para producción:
```bash
npm run build
```
Los archivos compilados estarán en `dist/burtsa-app/`

## 📱 Uso

### Navegación Principal

- **IBEX35**: Accede a la vista del índice IBEX 35 con:
  - Valor actual del índice
  - Top 5 mejores valores del día
  - Top 5 peores valores del día
  - Tabla completa con todos los valores

- **Mercado Continuo**: Visualiza todos los valores del mercado continuo español

### Tabla de Valores

Cada fila muestra:
- **Valor**: Nombre de la compañía
- **Último**: Último precio negociado
- **Var**: Variación absoluta respecto al cierre anterior
- **Var%**: Variación porcentual
- **Vol**: Volumen negociado
- **Anterior**: Precio de cierre anterior
- **Máximo**: Precio máximo del día
- **Mínimo**: Precio mínimo del día
- **Hora**: Estado del mercado (CIERRE)

### Actualización de Datos

- Los datos se actualizan automáticamente cada 60 segundos
- Puedes forzar una actualización recargando la página

## 🎨 Personalización

### Colores del Tema

Edita `src/app/components/market-view/market-view.component.scss`:

```scss
// Color principal
$primary-color: #2c7a7b;

// Colores de variación
$positive-color: #16a34a;
$negative-color: #dc2626;
```

### Intervalo de Actualización

Modifica en `src/app/components/market-view/market-view.component.ts`:

```typescript
// Cambiar de 60000 (1 minuto) a otro valor en milisegundos
setInterval(() => this.loadMarketData(), 60000);
```

## 📂 Estructura del Proyecto

```
burtsa-app/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── market-view/         # Componente principal de mercado
│   │   ├── services/
│   │   │   └── market-data.service.ts  # Servicio de datos
│   │   ├── app.component.ts         # Componente raíz
│   │   ├── app.config.ts           # Configuración de la app
│   │   └── app.routes.ts           # Rutas de navegación
│   ├── assets/                     # Recursos estáticos
│   ├── index.html                  # HTML principal
│   ├── main.ts                     # Bootstrap de Angular
│   └── styles.scss                 # Estilos globales
├── angular.json                    # Configuración de Angular CLI
├── package.json                    # Dependencias del proyecto
└── tsconfig.json                   # Configuración de TypeScript
```

## 🔄 Próximas Funcionalidades

- [ ] Gráficos interactivos con histórico de precios
- [ ] Sistema de alertas de precio
- [ ] Portfolio personal con seguimiento de inversiones
- [ ] Noticias financieras integradas
- [ ] Análisis técnico avanzado
- [ ] Exportación de datos a Excel/CSV
- [ ] Modo oscuro
- [ ] Multiidioma (Castellano/Euskera/Inglés)

## 🐛 Solución de Problemas

### Error: "Cannot find module '@angular/...'"
```bash
npm install
```

### Error de CORS al acceder a la API
Configura un proxy en `angular.json` o usa una API que soporte CORS.

### Los datos no se actualizan
1. Verifica tu conexión a internet
2. Comprueba que la API key es válida
3. Revisa los límites de tu plan de API

## 📝 Notas Importantes

### Datos Simulados vs Reales

La aplicación viene configurada con datos simulados que replican la estructura de las capturas de pantalla proporcionadas. Para producción:

1. Configura una API real (ver sección "Configurar API")
2. Actualiza los métodos en `market-data.service.ts`
3. Implementa manejo de errores robusto
4. Considera implementar caché para reducir llamadas a la API

### Consideraciones Legales

- Asegúrate de cumplir con los términos de servicio de la API que uses
- Los datos en tiempo real pueden requerir licencias especiales
- Consulta con un asesor legal si planeas comercializar la aplicación

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la Licencia MIT.

## 👨‍💻 Autor

Creado para gestión de inversiones en bolsa del mercado español.

## 🙏 Agradecimientos

- Angular Team por el excelente framework
- Proveedores de APIs de datos financieros
- Comunidad de desarrolladores de Angular

---

**¡Feliz inversión! 📈💰**
# burtsa
# angular-burtsa-euribor
# burtsa-frontend
