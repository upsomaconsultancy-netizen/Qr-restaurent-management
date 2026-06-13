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
  taxes?: { name: string; rate: number }[];
  isAvailable?: boolean;
  isDeleted?: boolean;
}

export interface Category {
  _id?: string;
  name: string;
  parentId?: string;
  sortOrder: number;
}

@Injectable({ providedIn: 'root' })
export class MenuService {
  private api = inject(ApiService);

  // State signals
  items = signal<MenuItem[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Get all menu items
  getItems() {
    this.loading.set(true);
    this.error.set(null);
    return this.api.get<MenuItem[]>('/menu/items').subscribe({
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

  // Get all categories
  getCategories() {
    this.loading.set(true);
    this.error.set(null);
    return this.api.get<Category[]>('/menu/categories').subscribe({
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
  createItem(item: MenuItem, imageFile?: File) {
    this.loading.set(true);
    this.error.set(null);

    const formData = new FormData();
    formData.append('name', item.name);
    formData.append('description', item.description || '');
    formData.append('price', item.price.toString());
    formData.append('categoryId', item.categoryId);
    formData.append('foodType', item.foodType);
    formData.append('spicyLevel', item.spicyLevel.toString());
    formData.append('prepTimeMinutes', item.prepTimeMinutes.toString());
    formData.append('variants', JSON.stringify(item.variants));
    formData.append('addons', JSON.stringify(item.addons));
    formData.append('taxes', JSON.stringify(item.taxes || []));

    if (imageFile) {
      formData.append('image', imageFile);
    }

    return this.api.post<MenuItem>('/menu/items', formData).subscribe({
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
  updateItem(itemId: string, item: Partial<MenuItem>, imageFile?: File) {
    this.loading.set(true);
    this.error.set(null);

    const formData = new FormData();
    if (item.name) formData.append('name', item.name);
    if (item.description) formData.append('description', item.description);
    if (item.price) formData.append('price', item.price.toString());
    if (item.categoryId) formData.append('categoryId', item.categoryId);
    if (item.foodType) formData.append('foodType', item.foodType);
    if (item.spicyLevel !== undefined) formData.append('spicyLevel', item.spicyLevel.toString());
    if (item.prepTimeMinutes) formData.append('prepTimeMinutes', item.prepTimeMinutes.toString());
    if (item.variants) formData.append('variants', JSON.stringify(item.variants));
    if (item.addons) formData.append('addons', JSON.stringify(item.addons));
    if (item.taxes) formData.append('taxes', JSON.stringify(item.taxes));

    if (imageFile) {
      formData.append('image', imageFile);
    }

    return this.api.patch<MenuItem>(`/menu/items/${itemId}`, formData).subscribe({
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

    return this.api.delete<any>(`/menu/items/${itemId}`).subscribe({
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
    return this.api.patch<MenuItem>(`/menu/items/${itemId}`, { isAvailable }).subscribe({
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

    return this.api.post<Category>('/menu/categories', category).subscribe({
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

    return this.api.delete<any>(`/menu/categories/${categoryId}`).subscribe({
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
