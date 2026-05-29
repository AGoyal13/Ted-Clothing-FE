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
      { path: '', redirectTo: 'products', pathMatch: 'full' },
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
      {
        path: 'inventory',
        loadComponent: () => import('./features/skus/inventory-upload.component').then(m => m.InventoryUploadComponent),
      },
      {
        path: 'product-import',
        loadComponent: () => import('./features/products/product-import.component').then(m => m.ProductImportComponent),
      },
      {
        path: 'feedback',
        loadComponent: () => import('./features/feedback/feedback.component').then(m => m.FeedbackComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
