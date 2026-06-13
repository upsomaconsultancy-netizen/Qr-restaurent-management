import { Injectable, signal } from '@angular/core';

type ToastType = 'success' | 'danger' | 'warning' | 'info';

type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(message: string, type: ToastType = 'danger', duration = 5000) {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto as Crypto).randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    this.toasts.update((list) => [...list, { id, type, message }]);

    setTimeout(() => this.remove(id), duration);
  }

  remove(id: string) {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }
}
