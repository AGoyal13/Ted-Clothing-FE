import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ShellComponent } from './layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'categories',
        loadComponent: () => import('./features/categories/categories.component').then(m => m.CategoriesComponent),
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent),
      },
      {
        path: 'products/:id',
        loadComponent: () => import('./features/products/product-detail.component').then(m => m.ProductDetailComponent),
      },
      {
        path: 'skus',
        loadComponent: () => import('./features/skus/skus.component').then(m => m.SkusComponent),
      },
      // Inventory Upload route disabled — page superseded by Inventory dashboard + Product Import
      // {
      //   path: 'inventory',
      //   loadComponent: () => import('./features/skus/inventory-upload.component').then(m => m.InventoryUploadComponent),
      // },
      {
        path: 'product-import',
        loadComponent: () => import('./features/products/product-import.component').then(m => m.ProductImportComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/orders/orders.component').then(m => m.OrdersComponent),
      },
      {
        path: 'returns',
        loadComponent: () => import('./features/returns/returns.component').then(m => m.ReturnsComponent),
      },
      {
        path: 'warehouses',
        loadComponent: () => import('./features/shipping/warehouses.component').then(m => m.WarehousesComponent),
      },
      {
        path: 'shipping-cache',
        loadComponent: () => import('./features/shipping/shipping-cache.component').then(m => m.ShippingCacheComponent),
      },
      {
        path: 'feedback',
        loadComponent: () => import('./features/feedback/feedback.component').then(m => m.FeedbackComponent),
      },
      {
        path: 'reviews',
        loadComponent: () => import('./features/reviews/reviews.component').then(m => m.ReviewsComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
      },
      {
        path: 'audit-logs',
        loadComponent: () => import('./features/audit/audit-logs.component').then(m => m.AuditLogsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
