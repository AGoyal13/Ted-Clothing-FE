import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
    title: 'Ted Clothing — Quiet Luxury',
  },
  {
    path: 'category/:slug',
    loadComponent: () => import('./features/category/category.component').then(m => m.CategoryComponent),
  },
  {
    path: 'product/:slug',
    loadComponent: () => import('./features/product/product.component').then(m => m.ProductComponent),
  },
  {
    path: 'cart',
    loadComponent: () => import('./features/cart/cart.component').then(m => m.CartComponent),
  },
  {
    path: 'account',
    loadComponent: () => import('./features/account/account.component').then(m => m.AccountComponent),
  },
  {
    path: 'account/:tab',
    loadComponent: () => import('./features/account/account.component').then(m => m.AccountComponent),
  },
  {
    path: 'wishlist',
    loadComponent: () => import('./features/wishlist/wishlist.component').then(m => m.WishlistPageComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
