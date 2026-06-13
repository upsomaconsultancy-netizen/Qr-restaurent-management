import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-toast',
  template: `
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1080;">
      <div *ngFor="let toast of toastService.toasts()" class="toast show align-items-center text-white border-0 mb-2"
           [ngClass]="{
             'bg-danger': toast.type === 'danger',
             'bg-success': toast.type === 'success',
             'bg-warning text-dark': toast.type === 'warning',
             'bg-info text-dark': toast.type === 'info'
           }">
        <div class="d-flex">
          <div class="toast-body">{{ toast.message }}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"
                  (click)="toastService.remove(toast.id)"></button>
        </div>
      </div>
    </div>
  `
})
export class ToastComponent {
  toastService = inject(ToastService);
}
