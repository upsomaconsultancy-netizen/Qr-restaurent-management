import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiService } from './api.service';

export interface Outlet {
  _id: string;
  restaurantId: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE';
  tableLimit: number;
  createdAt: string;
}

export interface OutletStats {
  outlet: Outlet;
  tableCount: number;
  tableLimit: number;
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
}

export interface TableAvailability {
  restaurantLimit: number;
  totalAllocated: number;
  totalUsed: number;
  remaining: number;
  outlets: { _id: string; name: string; tableLimit: number; tablesCreated: number }[];
}

@Injectable({ providedIn: 'root' })
export class OutletService {
  private api = inject(ApiService);

  getOutlets() {
    return this.api.get<Outlet[]>('/tenant/outlets').pipe(map(r => r.data));
  }

  getTableAvailability() {
    return this.api.get<TableAvailability>('/tenant/outlets/table-availability').pipe(map(r => r.data));
  }

  createOutlet(data: Partial<Outlet> & { tableLimit?: number }) {
    return this.api.post<Outlet>('/tenant/outlets', data).pipe(map(r => r.data));
  }

  updateOutlet(id: string, data: Partial<Outlet> & { tableLimit?: number }) {
    return this.api.patch<Outlet>(`/tenant/outlets/${id}`, data).pipe(map(r => r.data));
  }

  toggleOutlet(id: string) {
    return this.api.patch<Outlet>(`/tenant/outlets/${id}/toggle`, {}).pipe(map(r => r.data));
  }

  deleteOutlet(id: string) {
    return this.api.delete<void>(`/tenant/outlets/${id}`);
  }

  getOutletStats(id: string) {
    return this.api.get<OutletStats>(`/tenant/outlets/${id}/stats`).pipe(map(r => r.data));
  }

  getConsolidated(period = 'month') {
    return this.api.get<any>('/tenant/analytics/consolidated', { period }).pipe(map(r => r.data));
  }
}
