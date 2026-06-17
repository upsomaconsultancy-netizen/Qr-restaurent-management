import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService, Category } from '../../core/services/menu.service';
import { AuthService } from '../../core/services/auth.service';
import { ImageUploadComponent } from '../../shared/components/image-upload.component';

@Component({
  selector: 'app-category-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUploadComponent],
  styles: [
    `
      .category-manager-card {
        background: var(--ros-surface);
        border-radius: var(--ros-radius);
        border: 1px solid rgba(15, 23, 42, 0.08);
        box-shadow: var(--ros-shadow);
        padding: 1rem;
      }

      .category-manager-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
      }

      .category-manager-header h5 {
        margin-bottom: 0;
        font-size: 1rem;
        font-weight: 700;
      }

      .category-add-btn {
        min-width: 150px;
      }

      .category-form {
        margin-bottom: 1rem;
      }

      .category-list .list-group-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        padding: 0.85rem 1rem;
        border: none;
        border-bottom: 1px solid rgba(15, 23, 42, 0.06);
      }

      .category-list .list-group-item:last-child {
        border-bottom: none;
      }

      .category-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .category-info {
        min-width: 0;
      }

      .category-name {
        display: block;
        font-weight: 600;
        color: var(--ros-ink);
        white-space: normal;
      }

      .category-count {
        font-size: 0.8rem;
        color: #64748b;
      }

      .category-actions {
        display: flex;
        gap: 0.5rem;
      }

      @media (max-width: 700px) {
        .category-manager-header {
          flex-direction: column;
          align-items: stretch;
        }

        .category-add-btn {
          width: 100%;
        }

        .category-list .list-group-item {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `
  ],
  template: `
    <div class="category-manager-card mb-3">
      <div class="category-manager-header">
        <h5>Categories</h5>
        <button class="btn btn-sm btn-primary category-add-btn" (click)="toggleForm()">+ Add Category</button>
      </div>

      @if (showAddForm()) {
        <div class="category-form ros-card p-3 mb-3">
          <div class="mb-2">
            <input type="text" class="form-control form-control-sm mb-2" [(ngModel)]="newCategory.name" placeholder="Category name" />
            <app-image-upload folder="category" [imageUrl]="imageUrl()" [imagePublicId]="imagePublicId()"
              (imageUrlChange)="imageUrl.set($event)" (imagePublicIdChange)="imagePublicId.set($event)">
            </app-image-upload>
            <div class="d-flex gap-2 flex-wrap mt-2">
              <button class="btn btn-sm btn-success" (click)="addCategory()" [disabled]="menu.loading()">Add</button>
              <button class="btn btn-sm btn-secondary" (click)="toggleForm()">Cancel</button>
            </div>
          </div>
        </div>
      }

      @if (menu.error()) {
        <div class="alert alert-danger alert-sm">{{ menu.error() }}</div>
      }

      @if (!menu.categories().length) {
        <div class="alert alert-info alert-sm">No categories yet.</div>
      } @else {
        <div class="ros-card category-list">
          <div class="list-group list-group-flush">
            @for (cat of menu.categories(); track cat._id) {
              <div class="list-group-item category-item">
                <div class="category-info d-flex align-items-center gap-2">
                  @if (cat.imageUrl) {
                    <img [src]="cat.imageUrl" alt="" width="32" height="32" class="rounded object-fit-cover">
                  }
                  <div>
                    <span class="category-name">{{ cat.name }}</span>
                    <small class="category-count">{{ getItemCount(cat._id!) }} items</small>
                  </div>
                </div>
                <div class="category-actions">
                  @if (auth.user()?.role === 'OWNER') {
                    <button class="btn btn-sm btn-outline-danger" (click)="confirmDelete(cat._id!)" [disabled]="menu.loading()">Delete</button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class CategoryManagerComponent implements OnInit {
  menu = inject(MenuService);
  auth = inject(AuthService);

  showAddForm = signal(false);
  newCategory: Partial<Category> = { name: '', sortOrder: 0 };
  imageUrl = signal<string | null>(null);
  imagePublicId = signal<string | null>(null);

  ngOnInit() {
    this.menu.getCategories();
  }

  toggleForm() {
    this.showAddForm.set(!this.showAddForm());
    if (!this.showAddForm()) {
      this.newCategory = { name: '', sortOrder: 0 };
      this.imageUrl.set(null);
      this.imagePublicId.set(null);
    }
  }

  addCategory() {
    if (!this.newCategory.name) return;
    this.menu.createCategory({
      name: this.newCategory.name,
      sortOrder: this.newCategory.sortOrder || 0,
      imageUrl: this.imageUrl() || undefined,
      imagePublicId: this.imagePublicId() || undefined
    });
    this.newCategory = { name: '', sortOrder: 0 };
    this.imageUrl.set(null);
    this.imagePublicId.set(null);
    this.showAddForm.set(false);
  }

  confirmDelete(categoryId: string) {
    if (!confirm('Delete this category? This cannot be undone.')) return;
    this.menu.deleteCategory(categoryId);
  }

  getItemCount(catId: string): number {
    return this.menu.items().filter(i => i.categoryId === catId).length;
  }
}
