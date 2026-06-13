import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-staff-management',
  template: `
  <div class="ros-card p-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <h5 class="mb-0">Staff management</h5>
        <small class="text-muted">Add, search, edit, and enable/disable kitchen and waiter staff.</small>
      </div>
      <button class="btn btn-sm btn-primary" (click)="openForm()">+ Add staff member</button>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-md-6">
        <input class="form-control" placeholder="Search staff by name, email or role" [(ngModel)]="search" />
      </div>
    </div>

    <div class="table-responsive">
      <table class="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th style="width: 210px">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (staff of filteredStaff(); track staff._id) {
            <tr>
              <td>{{ staff.name }}</td>
              <td>{{ staff.email }}</td>
              <td>{{ staff.role }}</td>
              <td>
                <span class="badge" [class.text-bg-success]="staff.isActive" [class.text-bg-secondary]="!staff.isActive">
                  {{ staff.isActive ? 'Active' : 'Disabled' }}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-primary me-2" (click)="openForm(staff)">Edit</button>
                <button class="btn btn-sm btn-outline-secondary" (click)="toggleActive(staff)" [disabled]="saving()">
                  {{ staff.isActive ? 'Disable' : 'Enable' }}
                </button>
              </td>
            </tr>
          }
          @if (filteredStaff().length === 0) {
            <tr><td colspan="5" class="text-center text-muted">No staff found.</td></tr>
          }
        </tbody>
      </table>
    </div>
  </div>

  <div class="modal fade" tabindex="-1" [class.show]="showForm()" [style.display]="showForm() ? 'block' : 'none'">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ selectedStaff() ? 'Edit staff member' : 'Add staff member' }}</h5>
          <button type="button" class="btn-close" (click)="closeForm()"></button>
        </div>

        <div class="modal-body">
          @if (error()) {
            <div class="alert alert-danger mb-3">{{ error() }}</div>
          }

          <form (ngSubmit)="saveStaff()" #form="ngForm">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Name *</label>
                <input class="form-control" [(ngModel)]="name" name="name" required />
              </div>
              <div class="col-md-6">
                <label class="form-label">Email *</label>
                <input type="email" class="form-control" [(ngModel)]="email" name="email" required />
              </div>
            </div>

            <div class="row g-3 mt-3">
              <div class="col-md-6">
                <label class="form-label">Role *</label>
                <select class="form-select" [(ngModel)]="role" name="role" required>
                  @if (auth.user()?.role === 'OWNER') {
                    <option value="MANAGER">MANAGER</option>
                  }
                  <option value="WAITER">WAITER</option>
                  <option value="KITCHEN">KITCHEN</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Password {{ selectedStaff() ? '(leave blank to keep)' : '*' }}</label>
                <input type="password" class="form-control" [(ngModel)]="password" name="password" [required]="!selectedStaff()" />
              </div>
            </div>

            <div class="modal-footer mt-4">
              <button type="button" class="btn btn-secondary" (click)="closeForm()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="saving() || !canSubmit()">
                {{ saving() ? 'Saving...' : selectedStaff() ? 'Save changes' : 'Create staff' }}
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
  `
})
export class StaffManagementComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  staffList = signal<any[]>([]);
  search = signal('');
  showForm = signal(false);
  selectedStaff = signal<any | null>(null);
  name = signal('');
  email = signal('');
  password = signal('');
  role = signal<'WAITER' | 'KITCHEN'>('WAITER');
  saving = signal(false);
  error = signal<string | null>(null);

  filteredStaff = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) return this.staffList();
    return this.staffList().filter((staff) =>
      staff.name.toLowerCase().includes(query)
      || staff.email.toLowerCase().includes(query)
      || staff.role.toLowerCase().includes(query)
    );
  });

  ngOnInit() {
    this.loadStaff();
  }

  canSubmit() {
    if (!this.name().trim() || !this.email().trim()) return false;
    if (!this.selectedStaff() && !this.password().trim()) return false;
    return true;
  }

  loadStaff() {
    this.api.get<any[]>('/staff').subscribe(({ data }) => this.staffList.set(data));
  }

  openForm(staff?: any) {
    this.error.set(null);
    if (staff) {
      this.selectedStaff.set(staff);
      this.name.set(staff.name);
      this.email.set(staff.email);
      this.role.set(staff.role);
      this.password.set('');
    } else {
      this.selectedStaff.set(null);
      this.name.set('');
      this.email.set('');
      this.role.set('WAITER');
      this.password.set('');
    }
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.error.set(null);
  }

  saveStaff() {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.error.set(null);

    const payload: any = {
      name: this.name(),
      email: this.email(),
      role: this.role()
    };
    if (this.password().trim()) payload.password = this.password();

    const request = this.selectedStaff()
      ? this.api.patch<any>(`/staff/${this.selectedStaff()!._id}`, payload)
      : this.api.post<any>('/staff', payload);

    request.subscribe({
      next: () => {
        this.loadStaff();
        this.closeForm();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Unable to save staff');
        this.saving.set(false);
      }
    });
  }

  toggleActive(staff: any) {
    this.saving.set(true);
    this.api.patch(`/staff/${staff._id}/toggle`, {}).subscribe({
      next: () => {
        this.loadStaff();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Unable to update status');
        this.saving.set(false);
      }
    });
  }
}
