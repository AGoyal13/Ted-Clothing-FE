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
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      {
        path: 'profile',
        loadComponent: () => import('./features/account/tabs/profile/profile-tab.component').then(m => m.ProfileTabComponent),
      },
      {
        path: 'addresses',
        loadComponent: () => import('./features/account/tabs/addresses/addresses-tab.component').then(m => m.AddressesTabComponent),
      },
      {
        path: 'wishlist',
        loadComponent: () => import('./features/account/tabs/wishlist/wishlist-tab.component').then(m => m.WishlistTabComponent),
      },
      {
        path: 'preferences',
        loadComponent: () => import('./features/account/tabs/preferences/preferences-tab.component').then(m => m.PreferencesTabComponent),
      },
    ],
  },
  {
    path: 'wishlist',
    loadComponent: () => import('./features/wishlist/wishlist.component').then(m => m.WishlistPageComponent),
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/checkout/checkout.component').then(m => m.CheckoutComponent),
  },
  {
    path: 'order-confirmed/:id',
    loadComponent: () => import('./features/order-confirmed/order-confirmed.component').then(m => m.OrderConfirmedComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
