import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Customer QR entry point — what every printed QR code opens
  {
    path: 'm/:qrToken',
    loadComponent: () => import('./features/customer/customer-menu.component').then(m => m.CustomerMenuComponent)
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'kitchen',
    canActivate: [authGuard, roleGuard(['KITCHEN', 'MANAGER', 'OWNER'])],
    loadComponent: () => import('./features/kitchen/kitchen.component').then(m => m.KitchenComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, roleGuard(['OWNER', 'MANAGER', 'WAITER'])],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['SUPER_ADMIN'])],
    loadComponent: () => import('./features/superadmin/superadmin.component').then(m => m.SuperadminComponent)
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
