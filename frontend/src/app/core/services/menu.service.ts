import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

export interface MenuItem {
  _id?: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  foodType: 'VEG' | 'NON_VEG' | 'JAIN';
  spicyLevel: number;
  prepTimeMinutes: number;
  imageUrl?: string;
  imagePublicId?: string;
  variants: any[];
  addons: any[];
  taxes?: { name: string; rate: number; type?: 'PERCENTAGE' | 'FLAT' }[];
  isAvailable?: boolean;
  isDeleted?: boolean;
}

export interface Category {
  _id?: string;
  name: string;
  parentId?: string;
  sortOrder: number;
  imageUrl?: string;
  imagePublicId?: string;
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private api = inject(ApiService);

  // State signals
  items = signal<MenuItem[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Set by dashboard when Owner switches outlet view; null = own menu
  selectedOutletId = signal<string | null>(null);

  // Get menu items — uses selectedOutletId if set (Owner viewing an outlet's menu)
  getItems(outletId?: string | null) {
    this.loading.set(true);
    this.error.set(null);
    const oid = outletId !== undefined ? outletId : this.selectedOutletId();
    const params: any = {};
    if (oid) params['outletId'] = oid;
    return this.api.get<MenuItem[]>('/tenant/menu/items', params).subscribe({
      next: ({ data }) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  // Get categories — uses selectedOutletId if set
  getCategories(outletId?: string | null) {
    this.loading.set(true);
    this.error.set(null);
    const oid = outletId !== undefined ? outletId : this.selectedOutletId();
    const params: any = {};
    if (oid) params['outletId'] = oid;
    return this.api.get<Category[]>('/tenant/menu/categories', params).subscribe({
      next: ({ data }) => {
        this.categories.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  // Create new item
  createItem(item: MenuItem) {
    this.loading.set(true);
    this.error.set(null);

    return this.api.post<MenuItem>('/tenant/menu/items', item).subscribe({
      next: ({ data }) => {
        this.items.set([...this.items(), data]);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  // Update item
  updateItem(itemId: string, item: Partial<MenuItem>) {
    this.loading.set(true);
    this.error.set(null);

    return this.api.patch<MenuItem>(`/tenant/menu/items/${itemId}`, item).subscribe({
      next: ({ data }) => {
        const items = this.items();
        const idx = items.findIndex(i => i._id === itemId);
        if (idx >= 0) {
          items[idx] = data;
          this.items.set([...items]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  // Delete item
  deleteItem(itemId: string) {
    this.loading.set(true);
    this.error.set(null);

    return this.api.delete<any>(`/tenant/menu/items/${itemId}`).subscribe({
      next: () => {
        this.items.set(this.items().filter(i => i._id !== itemId));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  toggleItemAvailability(itemId: string, isAvailable: boolean) {
    this.loading.set(true);
    this.error.set(null);
    return this.api.patch<MenuItem>(`/tenant/menu/items/${itemId}`, { isAvailable }).subscribe({
      next: ({ data }) => {
        const items = this.items();
        const idx = items.findIndex(i => i._id === itemId);
        if (idx >= 0) {
          items[idx] = data;
          this.items.set([...items]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  // Create category
  createCategory(category: Category) {
    this.loading.set(true);
    this.error.set(null);

    return this.api.post<Category>('/tenant/menu/categories', category).subscribe({
      next: ({ data }) => {
        this.categories.set([...this.categories(), data]);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  deleteCategory(categoryId: string) {
    this.loading.set(true);
    this.error.set(null);

    return this.api.delete<any>(`/tenant/menu/categories/${categoryId}`).subscribe({
      next: () => {
        this.categories.set(this.categories().filter((c) => c._id !== categoryId));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }
}
