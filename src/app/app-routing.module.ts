import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'barcode-scanner',
    loadChildren: () => import('./barcode-scanner/barcode-scanner.module').then( m => m.BarcodeScannerPageModule)
  },
  {
    path: 'barcode-scanner',
    loadChildren: () => import('./barcode-scanner/barcode-scanner.module').then( m => m.BarcodeScannerPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
