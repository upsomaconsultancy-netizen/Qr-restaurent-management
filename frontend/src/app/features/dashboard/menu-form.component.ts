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

              <!-- Price + Category -->
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Price (&#8377;) *</label>
                  <input type="number" class="form-control" [(ngModel)]="formData.price" name="price" required min="0" step="0.01">
                </div>
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
                    <div class="small text-muted">Add tax as % of price or flat &#8377; amount per unit.</div>
                  </div>
                  <button type="button" class="btn btn-sm btn-primary" (click)="addTax()">+ Add Tax</button>
                </div>
                @if (formData.taxes?.length) {
                  @for (tax of formData.taxes; track taxIndex(tax)) {
                    <div class="row g-2 align-items-end mb-2">
                      <div class="col-4">
                        <label class="form-label small mb-1">Tax Name</label>
                        <input type="text" class="form-control form-control-sm"
                          [(ngModel)]="tax.name"
                          [name]="'taxName' + taxIndex(tax)"
                          placeholder="e.g. GST, VAT">
                      </div>
                      <div class="col-3">
                        <label class="form-label small mb-1">Type</label>
                        <select class="form-select form-select-sm"
                          [(ngModel)]="tax.type"
                          [name]="'taxType' + taxIndex(tax)"
                          (ngModelChange)="tax.rate = 0">
                          <option value="PERCENTAGE">% of Price</option>
                          <option value="FLAT">&#8377; Flat per unit</option>
                        </select>
                      </div>
                      <div class="col-3">
                        <label class="form-label small mb-1">
                          {{ tax.type === 'FLAT' ? 'Amount (&#8377;)' : 'Rate (%)' }}
                        </label>
                        <div class="input-group input-group-sm">
                          <span class="input-group-text">{{ tax.type === 'FLAT' ? '&#8377;' : '%' }}</span>
                          <input type="number" class="form-control"
                            [(ngModel)]="tax.rate"
                            [name]="'taxRate' + taxIndex(tax)"
                            min="0" step="0.01" placeholder="0">
                        </div>
                      </div>
                      <div class="col-2">
                        <button type="button" class="btn btn-outline-danger btn-sm w-100"
                          (click)="removeTaxByItem(tax)">&#x2715;</button>
                      </div>
                    </div>
                  }
                } @else {
                  <div class="text-muted small">No taxes added. Click "+ Add Tax" to define item-level taxes.</div>
                }
              </div>

              <!-- Food Type + Spicy Level -->
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label">Food Type *</label>
                  <select class="form-select" [(ngModel)]="formData.foodType" name="foodType" required>
                    <option value="VEG">&#x1F7E2; Veg</option>
                    <option value="NON_VEG">&#x1F534; Non-Veg</option>
                    <option value="JAIN">&#x2618;&#xFE0F; Jain</option>
                  </select>
                </div>
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
                    <img [src]="imagePreview()" alt="Preview" style="max-width:200px;max-height:200px;" class="rounded">
                  </div>
                }
              </div>

              <!-- Variants JSON -->
              <div class="mb-3">
                <label class="form-label">Variants (JSON)</label>
                <textarea class="form-control" [(ngModel)]="variantsJson" name="variants" rows="2"
                  placeholder='[{"name":"Small","price":50}]'></textarea>
              </div>

              <!-- Addons JSON -->
              <div class="mb-3">
                <label class="form-label">Add-ons (JSON)</label>
                <textarea class="form-control" [(ngModel)]="addonsJson" name="addons" rows="2"
                  placeholder='[{"name":"Extra Sauce","price":30}]'></textarea>
              </div>

              <div class="modal-footer px-0">
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
      this.formData = {
        ...item,
        taxes: item.taxes ? item.taxes.map(t => ({ ...t, type: t.type || 'PERCENTAGE' })) : []
      };
      this.variantsJson = JSON.stringify(item.variants || []);
      this.addonsJson = JSON.stringify(item.addons || []);
      if (item.imageUrl) this.imagePreview.set(item.imageUrl);
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
      reader.onload = (e) => this.imagePreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  submitForm() {
    try {
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

      setTimeout(() => this.closeForm(), 500);
    } catch (e: any) {
      this.error.set('Invalid JSON in variants or add-ons: ' + e.message);
    }
  }

  addTax() {
    this.formData.taxes = [...(this.formData.taxes || []), { name: '', rate: 0, type: 'PERCENTAGE' }];
  }

  removeTaxByItem(tax: any) {
    this.formData.taxes = (this.formData.taxes || []).filter(t => t !== tax);
  }

  taxIndex(tax: any) {
    return (this.formData.taxes || []).indexOf(tax);
  }
}
