import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './core/ui/toast.component';
import { LoaderComponent } from './core/ui/loader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, LoaderComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toast></app-toast>
    <app-loader></app-loader>
  `
})
export class AppComponent {}
