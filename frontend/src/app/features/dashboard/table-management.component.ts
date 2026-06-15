import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { QrService } from '../../core/services/qr.service';
import { QrDisplayComponent } from './qr-display.component';

interface Table {
  _id: string;
  number: number;
  qrCode: string;
  qrUrl?: string;
  capacity: number;
  isActive: boolean;
  outletId?: string;
}

interface Outlet {
  _id: string;
  name: string;
  tableLimit: number;
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

          <!-- Outlet selector:
               OWNER: dropdown when multiple outlets, label when single
               MANAGER/WAITER/KITCHEN: always auto-selected (no dropdown, just a label) -->
          @if (isOwner()) {
            @if (outlets().length > 1) {
              <div class="col-12">
                <label class="form-label form-label-sm fw-semibold">Outlet *</label>
                <select class="form-select form-select-sm" [(ngModel)]="newTable.outletId">
                  <option value="">-- Select Outlet --</option>
                  @for (o of outlets(); track o._id) {
                    <option [value]="o._id">
                      {{ o.name }}{{ o.tableLimit > 0 ? ' (limit: ' + o.tableLimit + ')' : '' }}
                    </option>
                  }
                </select>
              </div>
            } @else if (outlets().length === 1) {
              <div class="col-12">
                <small class="text-muted">Outlet: <strong>{{ outlets()[0].name }}</strong></small>
              </div>
            }
          } @else {
            <!-- MANAGER / WAITER / KITCHEN: show their outlet name, no choice -->
            @if (outlets().length > 0) {
              <div class="col-12">
                <small class="text-muted">Outlet: <strong>{{ outlets()[0].name }}</strong></small>
              </div>
            }
          }

          <div class="col-md-6">
            <label class="form-label form-label-sm fw-semibold">Table Number *</label>
            <input
              type="number"
              class="form-control form-control-sm"
              [(ngModel)]="newTable.number"
              placeholder="e.g. 1"
            />
          </div>
          <div class="col-md-6">
            <label class="form-label form-label-sm fw-semibold">Capacity *</label>
            <input
              type="number"
              class="form-control form-control-sm"
              [(ngModel)]="newTable.capacity"
              placeholder="e.g. 4"
            />
          </div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-success" (click)="addTable()" [disabled]="loading()">
            {{ loading() ? 'Creating...' : 'Create Table' }}
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
                  @if (outlets().length > 1 && table.outletId) {
                    <div style="font-size:11px;color:#6366f1;font-weight:600;margin-top:2px;">
                      {{ outletName(table.outletId) }}
                    </div>
                  }
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
                [title]="outletName(table.outletId) || 'Restaurant'"
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
  private api  = inject(ApiService);
  private auth = inject(AuthService);
  private qr   = inject(QrService);

  tables      = signal<Table[]>([]);
  outlets     = signal<Outlet[]>([]);
  loading     = signal(false);
  error       = signal<string | null>(null);
  showAddForm = signal(false);

  newTable: any = { outletId: '', number: 0, capacity: 4 };

  isOwner(): boolean { return this.auth.user()?.role === 'OWNER'; }
  isManager(): boolean { return this.auth.user()?.role === 'MANAGER'; }
  canManageOutlets(): boolean { return this.isOwner() || this.isManager(); }

  ngOnInit() {
    this.loadOutlets();
    this.loadTables();
  }

  loadOutlets() {
    // WAITER/KITCHEN are not permitted to call /tenant/outlets.
    // Their outlet context comes from their JWT — synthesize a single-entry list.
    if (!this.canManageOutlets()) {
      const user = this.auth.user();
      if (user?.outletId) {
        const synthetic: Outlet = { _id: user.outletId, name: 'My Outlet', tableLimit: 0 };
        this.outlets.set([synthetic]);
        this.newTable.outletId = user.outletId;
      }
      return;
    }

    this.api.get<Outlet[]>('/tenant/outlets').subscribe({
      next: ({ data }) => {
        this.outlets.set(data);
        // MANAGER: auto-select their own outlet; OWNER: auto-select only when single outlet
        if (this.isManager() && data.length > 0) {
          this.newTable.outletId = data[0]._id;
        } else if (data.length === 1) {
          this.newTable.outletId = data[0]._id;
        }
      },
      error: () => {}
    });
  }

  loadTables() {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<Table[]>('/tenant/tables').subscribe({
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
    const opening = !this.showAddForm();
    this.showAddForm.set(opening);
    // Reset form both when opening and closing
    const outlets = this.outlets();
    const defaultOutlet = (!this.isOwner() && outlets.length > 0)
      ? outlets[0]._id
      : (outlets.length === 1 ? outlets[0]._id : '');
    this.newTable = { outletId: defaultOutlet, number: 0, capacity: 4 };
    this.error.set(null);
  }

  addTable() {
    if (!this.newTable.outletId) { this.error.set('Please select an outlet'); return; }
    if (!this.newTable.number)   { this.error.set('Table number is required'); return; }
    if (!this.newTable.capacity) { this.error.set('Capacity is required'); return; }

    this.loading.set(true);
    this.error.set(null);
    this.api.post<Table>('/tenant/tables', {
      outletId:  this.newTable.outletId,
      number:    this.newTable.number,
      capacity:  this.newTable.capacity,
      isActive:  true
    }).subscribe({
      next: ({ data }) => {
        this.tables.set([...this.tables(), data]);
        this.newTable = { outletId: this.newTable.outletId, number: 0, capacity: 4 };
        this.showAddForm.set(false);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || err.message || 'Failed to create table');
        this.loading.set(false);
      }
    });
  }

  toggleTable(table: Table) {
    this.loading.set(true);
    this.api.patch<Table>(`/tenant/tables/${table._id}/toggle`, {}).subscribe({
      next: ({ data }) => {
        const tables = this.tables();
        const idx = tables.findIndex(t => t._id === table._id);
        if (idx >= 0) { tables[idx] = data; this.tables.set([...tables]); }
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
      this.api.delete<any>(`/tenant/tables/${tableId}`).subscribe({
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

  outletName(outletId: string | undefined): string {
    if (!outletId) return '';
    return this.outlets().find(o => o._id === outletId)?.name || '';
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
