import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService, MenuItem, Category } from '../../core/services/menu.service';

@Component({
  selector: 'app-menu-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal fade" id="menuFormModal" tabindex="-1" [class.show]="showForm()" [style.display]="showForm() ? 'block' : 'none'">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editingId() ? 'Edit Item' : 'Add Menu Item' }}</h5>
            <button type="button" class="btn-close" (click)="closeForm()"></button>
          </div>

          <div class="modal-body">
            @if (error()) {
              <div class="alert alert-danger mb-3">{{ error() }}</div>
            }

            <form (ngSubmit)="submitForm()" #form="ngForm">
              <!-- Item Name -->
              <div class="mb-3">
                <label class="form-label">Item Name *</label>
                <input type="text" class="form-control" [(ngModel)]="formData.name" name="name" required>
              </div>

              <!-- Description -->
              <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea class="form-control" [(ngModel)]="formData.description" name="description" rows="2"></textarea>
              </div>

              <!-- Price -->
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Price (₹) *</label>
                  <input type="number" class="form-control" [(ngModel)]="formData.price" name="price" required min="0" step="0.01">
                </div>

                <!-- Category -->
                <div class="col-md-6 mb-3">
                  <label class="form-label">Category *</label>
                  <select class="form-select" [(ngModel)]="formData.categoryId" name="categoryId" required>
                    <option value="">Select category</option>
                    @for (cat of menu.categories(); track cat._id) {
                      <option [value]="cat._id">{{ cat.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Tax definitions -->
              <div class="mb-4 p-3 border rounded bg-light">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <div>
                    <label class="form-label mb-0">Item Taxes (optional)</label>
                    <div class="small text-muted">Add one or more tax entries that apply to this menu item.</div>
                  </div>
                  <button type="button" class="btn btn-sm btn-primary" (click)="addTax()">+ Add tax</button>
                </div>
                @if (formData.taxes?.length) {
                  @for (tax of formData.taxes; track tax.name) {
                    <div class="row g-2 align-items-end mb-2">
                      <div class="col-6">
                        <label class="form-label">Tax name</label>
                        <input type="text" class="form-control" [(ngModel)]="tax.name" name="taxName{{ taxIndex(tax) }}" placeholder="GST, Service fee">
                      </div>
                      <div class="col-4">
                        <label class="form-label">Rate (%)</label>
                        <input type="number" class="form-control" [(ngModel)]="tax.rate" name="taxRate{{ taxIndex(tax) }}" min="0" step="0.01" placeholder="0">
                      </div>
                      <div class="col-2">
                        <button type="button" class="btn btn-outline-danger w-100" (click)="removeTaxByItem(tax)">Remove</button>
                      </div>
                    </div>
                  }
                } @else {
                  <div class="text-muted">No taxes defined. Click “Add tax” to add item-level tax rules.</div>
                }
              </div>

              <!-- Food Type -->
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Food Type *</label>
                  <select class="form-select" [(ngModel)]="formData.foodType" name="foodType" required>
                    <option value="VEG">🟢 Veg</option>
                    <option value="NON_VEG">🔴 Non-Veg</option>
                    <option value="JAIN">☘️ Jain</option>
                  </select>
                </div>

                <!-- Spicy Level -->
                <div class="col-md-6 mb-3">
                  <label class="form-label">Spicy Level (0-5)</label>
                  <input type="number" class="form-control" [(ngModel)]="formData.spicyLevel" name="spicyLevel" min="0" max="5">
                </div>
              </div>

              <!-- Prep Time -->
              <div class="mb-3">
                <label class="form-label">Prep Time (minutes) *</label>
                <input type="number" class="form-control" [(ngModel)]="formData.prepTimeMinutes" name="prepTimeMinutes" required min="1">
              </div>

              <!-- Image Upload -->
              <div class="mb-3">
                <label class="form-label">Image (Optional)</label>
                <input type="file" class="form-control" #imageInput (change)="onImageSelect($event)" accept="image/*">
                @if (imagePreview()) {
                  <div class="mt-2">
                    <img [src]="imagePreview()" alt="Preview" style="max-width: 200px; max-height: 200px;" class="rounded">
                  </div>
                }
              </div>

              <!-- Variants (Simple JSON) -->
              <div class="mb-3">
                <label class="form-label">Variants (JSON)</label>
                <textarea class="form-control" [(ngModel)]="variantsJson" name="variants" rows="2" placeholder="[{&quot;name&quot;:&quot;Size&quot;,&quot;options&quot;:[]}]"></textarea>
              </div>

              <!-- Addons (Simple JSON) -->
              <div class="mb-3">
                <label class="form-label">Add-ons (JSON)</label>
                <textarea class="form-control" [(ngModel)]="addonsJson" name="addons" rows="2" placeholder="[{&quot;name&quot;:&quot;Extra Sauce&quot;,&quot;price&quot;:30}]"></textarea>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeForm()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="menu.loading()">
                  {{ menu.loading() ? 'Saving...' : 'Save Item' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Backdrop -->
    @if (showForm()) {
      <div class="modal-backdrop fade show" (click)="closeForm()"></div>
    }
  `,
  styles: [`
    .modal.show { display: block; }
    .modal-backdrop.show { opacity: 0.5; }
  `]
})
export class MenuFormComponent implements OnInit {
  menu = inject(MenuService);

  showForm = signal(false);
  editingId = signal<string | null>(null);
  error = signal<string | null>(null);
  imageFile = signal<File | null>(null);
  imagePreview = signal<string | null>(null);

  formData: Partial<MenuItem> = {
    name: '',
    description: '',
    price: 0,
    categoryId: '',
    foodType: 'VEG',
    spicyLevel: 0,
    prepTimeMinutes: 15,
    variants: [],
    addons: [],
    taxes: []
  };

  variantsJson = '[]';
  addonsJson = '[]';

  ngOnInit() {
    this.menu.getCategories();
  }

  openForm(item?: MenuItem) {
    if (item) {
      this.editingId.set(item._id!);
      this.formData = { ...item, taxes: item.taxes ? [...item.taxes] : [] };
      this.variantsJson = JSON.stringify(item.variants || []);
      this.addonsJson = JSON.stringify(item.addons || []);
      if (item.imageUrl) {
        this.imagePreview.set(item.imageUrl);
      }
    } else {
      this.resetForm();
    }
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.resetForm();
  }

  resetForm() {
    this.editingId.set(null);
    this.error.set(null);
    this.imageFile.set(null);
    this.imagePreview.set(null);
    this.formData = {
      name: '',
      description: '',
      price: 0,
      categoryId: '',
      foodType: 'VEG',
      spicyLevel: 0,
      prepTimeMinutes: 15,
      variants: [],
      addons: [],
      taxes: []
    };
    this.variantsJson = '[]';
    this.addonsJson = '[]';
  }

  onImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.imageFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  submitForm() {
    try {
      // Parse JSON
      const variants = JSON.parse(this.variantsJson || '[]');
      const addons = JSON.parse(this.addonsJson || '[]');

      const itemData: Partial<MenuItem> = {
        ...this.formData,
        variants,
        addons,
        taxes: this.formData.taxes || []
      };

      if (this.editingId()) {
        this.menu.updateItem(this.editingId()!, itemData, this.imageFile() || undefined);
      } else {
        this.menu.createItem(itemData as MenuItem, this.imageFile() || undefined);
      }

      // Close after brief delay to show save
      setTimeout(() => {
        this.closeForm();
      }, 500);
    } catch (e: any) {
      this.error.set('Invalid JSON in variants or add-ons: ' + e.message);
    }
  }

  addTax() {
    this.formData.taxes = [...(this.formData.taxes || []), { name: '', rate: 0 }];
  }

  removeTaxByItem(tax: any) {
    this.formData.taxes = (this.formData.taxes || []).filter((item) => item !== tax);
  }

  taxIndex(tax: any) {
    return (this.formData.taxes || []).indexOf(tax);
  }
}
