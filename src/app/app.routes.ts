import { Routes } from '@angular/router';
import { MarketViewComponent } from './components/market-view/market-view.component';
import { StockDetailComponent } from './components/stock-detail/stock-detail.component';
import { AuthComponent } from './components/auth/auth.component';
import { PortfolioComponent } from './components/portfolio/portfolio.component';
import { authGuard } from './guards/auth.guard';
import { CashManagementComponent } from './components/cash-managment/cash-managment.component';
import { EuriborComponent } from './components/euribor/euribor.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'cash-management',
    component: CashManagementComponent,
    canActivate: [authGuard]  // ← Ruta protegida
  },
  {
    path: 'euribor',
    component: EuriborComponent
  },
  {
    path: 'login',
    component: AuthComponent
  },
  {
    path: 'portfolio',
    component: PortfolioComponent,
    canActivate: [authGuard]  // ← Ruta protegida
  },
  {
    path: 'ibex35',
    component: MarketViewComponent,
    data: { market: 'ibex35' }
  },
  {
    path: 'mercado-continuo',
    component: MarketViewComponent,
    data: { market: 'continuo' }
  },
  {
    path: 'stock/:symbol',
    component: StockDetailComponent
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];