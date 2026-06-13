import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuService } from '../../core/services/menu.service';
import { AuthService } from '../../core/services/auth.service';
import { MenuFormComponent } from './menu-form.component';

@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [CommonModule, MenuFormComponent],
  styles: [
    `
      .menu-hero {
        background: linear-gradient(135deg, #4b4be5 0%, #5f42f2 50%, #9f6bf4 100%);
        color: #fff;
        padding: 1.75rem 1.8rem;
        border-radius: var(--ros-radius);
        box-shadow: var(--ros-shadow);
        border: 1px solid rgba(255, 255, 255, 0.12);
      }
      .menu-hero-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .menu-hero .hero-tag {
        display: inline-flex;
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.16);
        color: #f3f5ff;
        font-size: 0.8rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 0.75rem;
      }
      .menu-hero h2 {
        margin: 0;
        font-size: 1.75rem;
        line-height: 1.1;
      }
      .menu-hero-copy {
        margin: 0.6rem 0 0;
        color: rgba(255, 255, 255, 0.84);
        max-width: 580px;
      }
      .hero-add-btn {
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: #fff;
        background: rgba(255, 255, 255, 0.12);
      }
      .hero-add-btn:hover {
        background: rgba(255, 255, 255, 0.18);
      }
      .menu-hero-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 1.5rem;
      }
      .hero-stat {
        background: rgba(255, 255, 255, 0.12);
        padding: 0.95rem 1.1rem;
        border-radius: 16px;
        min-width: 150px;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .hero-stat .stat-label {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.78);
      }
      .hero-stat strong {
        font-size: 1.25rem;
      }

      .table-card {
        border-radius: var(--ros-radius);
        overflow: hidden;
        margin-top: 1rem;
        box-shadow: var(--ros-shadow);
      }

      .table-responsive {
        overflow-x: auto;
      }

      .table-responsive table {
        min-width: 720px;
      }

      @media (max-width: 900px) {
        .menu-hero-top {
          flex-direction: column;
          align-items: stretch;
        }

        .hero-add-btn {
          width: 100%;
          justify-content: center;
        }

        .menu-hero-stats {
          gap: 0.65rem;
        }

        .hero-stat {
          flex: 1 1 48%;
          min-width: 140px;
        }
      }

      @media (max-width: 640px) {
        .menu-hero {
          padding: 1.25rem 1rem;
        }

        .menu-hero h2 {
          font-size: 1.4rem;
        }

        .menu-hero-copy {
          max-width: 100%;
        }

        .table-responsive table {
          min-width: 600px;
        }
      }
    `
  ],
  template: `
    <div class="menu-hero ros-card mb-4">
      <div class="menu-hero-top">
        <div>
          <span class="hero-tag">Menu Collection</span>
          <h2>Culinary Collection</h2>
          <p class="hero-copy">Manage your restaurant's menu items, categories, and pricing</p>
        </div>
        <button class="btn btn-sm btn-light hero-add-btn" (click)="openAddForm()">+ Add item</button>
      </div>
      <div class="menu-hero-stats">
        <div class="hero-stat">
          <span class="stat-label">Active Items</span>
          <strong>{{ menu.items().length }}</strong>
        </div>
        <div class="hero-stat">
          <span class="stat-label">Categories</span>
          <strong>{{ menu.categories().length }}</strong>
        </div>
      </div>
    </div>

    @if (menu.error()) {
      <div class="alert alert-danger">{{ menu.error() }}</div>
    }

    @if (menu.loading() && !menu.items().length) {
      <div class="text-center py-4">
        <div class="spinner-border spinner-border-sm" role="status"></div>
      </div>
    } @else if (!menu.items().length) {
      <div class="alert alert-info">No items yet. <button class="btn btn-sm btn-primary" (click)="openAddForm()">Add your first item</button></div>
    } @else {
      <div class="table-card ros-card">
        <div class="table-responsive">
          <table class="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th style="width: 80px;">Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Status</th>
              <th>Price</th>
              <th style="width: 120px;">Type</th>
              <th style="width: 80px;">Prep</th>
              <th style="width: 180px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (item of menu.items(); track item._id) {
              <tr>
                <td>
                  @if (item.imageUrl) {
                    <img [src]="item.imageUrl" alt="" width="40" height="40" class="rounded object-fit-cover">
                  } @else {
                    <span class="badge text-bg-secondary">No img</span>
                  }
                </td>
                <td>
                  <strong>{{ item.name }}</strong>
                  <br>
                  <small class="text-muted">{{ item.description }}</small>
                </td>
                <td>
                  <small>{{ getCategoryName(item.categoryId) }}</small>
                </td>
                <td>
                  <span class="badge text-bg-light border">{{ item.isAvailable !== false ? 'Available' : 'Hidden' }}</span>
                </td>
                <td>
                  <strong>₹{{ item.price }}</strong>
                  @if (item.taxes?.length) {
                    <div class="small text-muted mt-1">
                      <span class="badge bg-info text-dark me-1">⚖️</span>
                      {{ formatTaxes(item) }}
                    </div>
                  }
                </td>
                <td>
                  <span class="me-1" [title]="item.foodType">
                    @switch (item.foodType) {
                      @case ('VEG') { 🟢 }
                      @case ('NON_VEG') { 🔴 }
                      @case ('JAIN') { ☘️ }
                    }
                  </span>
                  @if (item.spicyLevel) {
                    <span title="Spicy level">{{ '🌶️'.repeat(item.spicyLevel) }}</span>
                  }
                </td>
                <td>
                  <small>{{ item.prepTimeMinutes }}m</small>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-primary me-1" (click)="editItem(item)">Edit</button>
                  <button class="btn btn-sm btn-outline-secondary me-1" (click)="toggleAvailability(item)" [disabled]="menu.loading()">
                    {{ item.isAvailable !== false ? 'Hide' : 'Show' }}
                  </button>
                  @if (auth.user()?.role === 'OWNER') {
                    <button class="btn btn-sm btn-outline-danger" (click)="deleteItem(item._id!)" [disabled]="menu.loading()">Delete</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
    }

    <app-menu-form #menuForm></app-menu-form>
  `
})
export class MenuListComponent implements OnInit {
  @ViewChild(MenuFormComponent) menuForm!: MenuFormComponent;

  menu = inject(MenuService);
  auth = inject(AuthService);

  ngOnInit() {
    this.menu.getItems();
    this.menu.getCategories();
  }

  openAddForm() {
    this.menuForm.openForm();
  }

  editItem(item: any) {
    this.menuForm.openForm(item);
  }

  deleteItem(itemId: string) {
    if (confirm('Are you sure you want to delete this item?')) {
      this.menu.deleteItem(itemId);
    }
  }

  toggleAvailability(item: any) {
    this.menu.toggleItemAvailability(item._id!, item.isAvailable !== false ? false : true);
  }

  getCategoryName(categoryId: string): string {
    return this.menu.categories().find(c => c._id === categoryId)?.name || '—';
  }

  formatTaxes(item: any): string {
    return (item.taxes || []).map((tax: any) => `${tax.name} ${tax.rate}%`).join(', ');
  }
}
