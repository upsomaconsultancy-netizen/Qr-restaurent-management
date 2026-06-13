import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  get<T>(path: string, params?: Record<string, any>) {
    return this.http.get<{ success: boolean; data: T }>(`${this.base}${path}`, { params });
  }
  post<T>(path: string, body: unknown) {
    return this.http.post<{ success: boolean; data: T }>(`${this.base}${path}`, body);
  }
  patch<T>(path: string, body: unknown) {
    return this.http.patch<{ success: boolean; data: T }>(`${this.base}${path}`, body);
  }
  delete<T>(path: string) {
    return this.http.delete<{ success: boolean; data: T }>(`${this.base}${path}`);
  }
}
