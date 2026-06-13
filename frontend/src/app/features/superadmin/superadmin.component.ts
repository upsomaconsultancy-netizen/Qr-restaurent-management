import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="container py-3">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h3 class="mb-0">Platform admin</h3>
      <button class="btn btn-sm btn-outline-secondary" (click)="auth.logout()">Sign out</button>
    </div>

    @if (stats(); as s) {
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3"><div class="ros-card p-3"><small class="text-muted">Restaurants</small><h4>{{ s.totalRestaurants }}</h4></div></div>
        <div class="col-6 col-md-3"><div class="ros-card p-3"><small class="text-muted">Active</small><h4>{{ s.activeRestaurants }}</h4></div></div>
        <div class="col-6 col-md-3"><div class="ros-card p-3"><small class="text-muted">Tables provisioned</small><h4>{{ s.totalTablesProvisioned }}</h4></div></div>
        <div class="col-6 col-md-3"><div class="ros-card p-3"><small class="text-muted">Gross order revenue</small><h4>₹{{ s.grossOrderRevenue }}</h4></div></div>
      </div>
    }

    <div class="table-responsive ros-card p-2 mb-4">
      <table class="table table-sm align-middle mb-0">
        <thead><tr><th>Name</th><th>Code</th><th>Plan</th><th>Tables</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (r of restaurants(); track r._id) {
            <tr>
              <td>{{ r.name }}</td><td>{{ r.code }}</td>
              <td>
                <select class="form-select form-select-sm" [ngModel]="r.plan" (ngModelChange)="setPlan(r, $event)">
                  <option>BASIC</option><option>STANDARD</option><option>PREMIUM</option>
                </select>
              </td>
              <td style="width:110px">
                <input class="form-control form-control-sm" type="number" [ngModel]="r.tableLimit"
                       (change)="setLimit(r, $event)">
              </td>
              <td><span class="badge" [class.text-bg-success]="r.status==='ACTIVE'" [class.text-bg-danger]="r.status!=='ACTIVE'">{{ r.status }}</span></td>
              <td>
                <button class="btn btn-sm btn-outline-secondary" (click)="toggle(r)">
                  {{ r.status === 'ACTIVE' ? 'Suspend' : 'Activate' }}
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="ros-card p-4" style="max-width: 560px;">
      <h5 class="mb-3">Create restaurant</h5>
      <div class="row g-2">
        <div class="col-6"><input class="form-control" placeholder="Name" [(ngModel)]="form.name"></div>
        <div class="col-6"><input class="form-control" placeholder="Code (e.g. R103)" [(ngModel)]="form.code"></div>
        <div class="col-6"><input class="form-control" placeholder="Restaurant email" [(ngModel)]="form.email"></div>
        <div class="col-6"><input class="form-control" type="number" placeholder="Table limit" [(ngModel)]="form.tableLimit"></div>
        <div class="col-6"><input class="form-control" placeholder="Owner name" [(ngModel)]="form.ownerName"></div>
        <div class="col-6"><input class="form-control" placeholder="Owner email" [(ngModel)]="form.ownerEmail"></div>
        <div class="col-12"><input class="form-control" type="password" placeholder="Owner password (8+ chars)" [(ngModel)]="form.ownerPassword"></div>
      </div>
      @if (msg()) { <div class="alert alert-info py-2 small mt-2 mb-0">{{ msg() }}</div> }
      <button class="btn btn-accent mt-3" (click)="create()">Create restaurant</button>
    </div>
  </div>`
})
export class SuperadminComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  restaurants = signal<any[]>([]);
  stats = signal<any>(null);
  msg = signal('');
  form: any = { tableLimit: 10 };

  ngOnInit() { this.load(); }

  load() {
    this.api.get<any[]>('/admin/restaurants').subscribe(({ data }) => this.restaurants.set(data));
    this.api.get<any>('/admin/stats').subscribe(({ data }) => this.stats.set(data));
  }
  toggle(r: any) {
    this.api.patch(`/admin/restaurants/${r._id}/status`, { status: r.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })
      .subscribe(() => this.load());
  }
  setPlan(r: any, plan: string) {
    this.api.patch(`/admin/restaurants/${r._id}/plan`, { plan }).subscribe(() => this.load());
  }
  setLimit(r: any, ev: Event) {
    const tableLimit = +(ev.target as HTMLInputElement).value;
    this.api.patch(`/admin/restaurants/${r._id}/table-limit`, { tableLimit }).subscribe({
      next: () => this.load(),
      error: (e) => { this.msg.set(e?.error?.message || 'Failed'); this.load(); }
    });
  }
  create() {
    this.api.post('/admin/restaurants', this.form).subscribe({
      next: () => { this.msg.set('Restaurant created.'); this.form = { tableLimit: 10 }; this.load(); },
      error: (e) => this.msg.set(e?.error?.message || 'Failed')
    });
  }
}
