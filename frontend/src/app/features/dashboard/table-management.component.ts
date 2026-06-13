import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { QrService } from '../../core/services/qr.service';
import { QrDisplayComponent } from './qr-display.component';

interface Table {
  _id: string;
  number: number;
  qrCode: string;
  qrUrl?: string;
  capacity: number;
  isActive: boolean;
}

@Component({
  selector: 'app-table-management',
  standalone: true,
  imports: [CommonModule, FormsModule, QrDisplayComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5>🪑 Table Management</h5>
      <button class="btn btn-sm btn-primary" (click)="toggleAddForm()">+ Add Table</button>
    </div>

    <!-- Add Table Form -->
    @if (showAddForm()) {
      <div class="ros-card p-3 mb-3">
        <div class="row g-2 mb-2">
          <div class="col-md-6">
            <input 
              type="number" 
              class="form-control form-control-sm" 
              [(ngModel)]="newTable.number" 
              placeholder="Table number"
            />
          </div>
          <div class="col-md-6">
            <input 
              type="number" 
              class="form-control form-control-sm" 
              [(ngModel)]="newTable.capacity" 
              placeholder="Capacity"
            />
          </div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-success" (click)="addTable()" [disabled]="loading()">
            {{ loading() ? 'Creating...' : 'Create' }}
          </button>
          <button class="btn btn-sm btn-secondary" (click)="toggleAddForm()">Cancel</button>
        </div>
      </div>
    }

    @if (error()) {
      <div class="alert alert-danger alert-sm">{{ error() }}</div>
    }

    <!-- Tables Grid -->
    @if (loading() && !tables().length) {
      <div class="text-center py-4">
        <div class="spinner-border spinner-border-sm" role="status"></div>
      </div>
    } @else if (!tables().length) {
      <div class="alert alert-info">No tables yet. Create your first table.</div>
    } @else {
      <div class="row g-3">
        @for (table of tables(); track table._id) {
          <div class="col-md-6 col-lg-4">
            <div class="ros-card p-3">
              <!-- Header -->
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 class="mb-0">Table #{{ table.number }}</h6>
                  <small class="text-muted">Capacity: {{ table.capacity }}</small>
                </div>
                <div class="form-check form-switch">
                  <input 
                    class="form-check-input" 
                    type="checkbox" 
                    [checked]="table.isActive"
                    (change)="toggleTable(table)"
                    [id]="'toggle-' + table._id"
                  />
                  <label class="form-check-label" [for]="'toggle-' + table._id">
                    {{ table.isActive ? '✓' : '✗' }}
                  </label>
                </div>
              </div>

              <!-- QR Code -->
              <app-qr-display 
                [qrToken]="table.qrCode"
                [tableNumber]="table.number"
                [title]="'Spice Garden'"
              ></app-qr-display>

              <div class="mt-3">
                <small class="text-muted">Customer URL</small>
                <div class="d-flex gap-2 align-items-center">
                  <input class="form-control form-control-sm" [value]="getQrUrl(table.qrCode)" readonly />
                  <button class="btn btn-sm btn-outline-secondary" type="button" (click)="copyText(getQrUrl(table.qrCode))">Copy</button>
                </div>
                <small class="text-muted mt-2 d-block">Token: {{ table.qrCode }}</small>
              </div>

              <!-- Delete Button -->
              <div class="mt-3">
                <button 
                  class="btn btn-sm btn-outline-danger w-100" 
                  (click)="deleteTable(table._id)"
                  [disabled]="loading()"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `
})
export class TableManagementComponent implements OnInit {
  private api = inject(ApiService);
  private qr = inject(QrService);

  tables = signal<Table[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  showAddForm = signal(false);

  newTable: any = { number: 0, capacity: 4 };

  ngOnInit() {
    this.loadTables();
  }

  loadTables() {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<Table[]>('/tables').subscribe({
      next: ({ data }) => {
        this.tables.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  toggleAddForm() {
    this.showAddForm.set(!this.showAddForm());
    if (!this.showAddForm()) {
      this.newTable = { number: 0, capacity: 4 };
    }
  }

  addTable() {
    if (!this.newTable.number || !this.newTable.capacity) {
      this.error.set('Please fill all fields');
      return;
    }

    this.loading.set(true);
    this.api.post<Table>('/tables', {
      number: this.newTable.number,
      capacity: this.newTable.capacity,
      isActive: true
    }).subscribe({
      next: ({ data }) => {
        this.tables.set([...this.tables(), data]);
        this.newTable = { number: 0, capacity: 4 };
        this.showAddForm.set(false);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  toggleTable(table: Table) {
    this.loading.set(true);
    this.api.patch<Table>(`/tables/${table._id}/toggle`, {}).subscribe({
      next: ({ data }) => {
        const tables = this.tables();
        const idx = tables.findIndex(t => t._id === table._id);
        if (idx >= 0) {
          tables[idx] = data;
          this.tables.set([...tables]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      }
    });
  }

  deleteTable(tableId: string) {
    if (confirm('Delete this table?')) {
      this.loading.set(true);
      this.api.delete<any>(`/tables/${tableId}`).subscribe({
        next: () => {
          this.tables.set(this.tables().filter(t => t._id !== tableId));
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message);
          this.loading.set(false);
        }
      });
    }
  }

  getQrUrl(qrCode: string): string {
    return `${window.location.origin}/m/${qrCode}`;
  }

  copyText(value: string) {
    navigator.clipboard.writeText(value).catch(() => {
      this.error.set('Copy failed. Please copy manually.');
    });
  }
}
