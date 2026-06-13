import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

const BLANK_FORM = () => ({
  name: '', code: '', email: '', phone: '', address: '',
  gstin: '', website: '', serviceChargePercent: 0, taxPercent: 5,
  plan: 'BASIC', tableLimit: 10,
  ownerName: '', ownerEmail: '', ownerPassword: ''
});

const BLANK_EDIT = () => ({
  name: '', email: '', phone: '', address: '',
  gstin: '', website: '', serviceChargePercent: 0, taxPercent: 5,
  plan: 'BASIC', tableLimit: 10, status: 'ACTIVE'
});

const BLANK_USER = () => ({ name: '', email: '', password: '', role: 'MANAGER' });

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="sa-root">

    <!-- ── Header ── -->
    <header class="sa-header">
      <div class="sa-header-inner">
        <div class="sa-brand">
          <div class="sa-brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
              <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
              <circle cx="12" cy="14" r="2"/>
            </svg>
          </div>
          <div>
            <div class="sa-brand-name">RestaurantOS</div>
            <div class="sa-brand-sub">Super Admin Console</div>
          </div>
        </div>
        <div class="sa-header-right">
          <div class="sa-user-chip">
            <div class="sa-avatar">SA</div>
            <span class="sa-user-label">Super Admin</span>
          </div>
          <button class="sa-logout-btn" (click)="auth.logout()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </header>

    <div class="sa-body">

      <!-- ── Stats Row ── -->
      @if (stats(); as s) {
        <div class="sa-stats-grid">
          <div class="sa-stat-card">
            <div class="sa-stat-icon sa-icon-blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
                <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
              </svg>
            </div>
            <div>
              <div class="sa-stat-val">{{ s.totalRestaurants }}</div>
              <div class="sa-stat-lbl">Total Restaurants</div>
            </div>
          </div>
          <div class="sa-stat-card">
            <div class="sa-stat-icon sa-icon-green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div>
              <div class="sa-stat-val">{{ s.activeRestaurants }}</div>
              <div class="sa-stat-lbl">Active</div>
            </div>
          </div>
          <div class="sa-stat-card">
            <div class="sa-stat-icon sa-icon-purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
            </div>
            <div>
              <div class="sa-stat-val">{{ s.totalTablesProvisioned }}</div>
              <div class="sa-stat-lbl">Tables Provisioned</div>
            </div>
          </div>
          <div class="sa-stat-card">
            <div class="sa-stat-icon sa-icon-amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div>
              <div class="sa-stat-val">₹{{ (s.grossOrderRevenue || 0) | number }}</div>
              <div class="sa-stat-lbl">Gross Revenue</div>
            </div>
          </div>
          <div class="sa-stat-card">
            <div class="sa-stat-icon sa-icon-rose">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div>
              <div class="sa-stat-val">{{ s.totalPaidOrders || 0 }}</div>
              <div class="sa-stat-lbl">Paid Orders</div>
            </div>
          </div>
        </div>
      }

      <!-- ── Section header ── -->
      <div class="sa-section-hdr">
        <div>
          <h2 class="sa-section-title">Restaurants</h2>
          <p class="sa-section-sub">Manage all restaurants, plans, tables and users</p>
        </div>
        <button class="sa-btn-primary" (click)="openCreate()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Restaurant
        </button>
      </div>

      <!-- ── Restaurants Table ── -->
      <div class="sa-card sa-table-wrap">
        <table class="sa-table">
          <thead>
            <tr>
              <th>Restaurant</th>
              <th>Code</th>
              <th>Contact</th>
              <th>Plan</th>
              <th>Tables</th>
              <th>Status</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (r of restaurants(); track r._id) {
              <tr>
                <td>
                  <div class="sa-rest-name">{{ r.name }}</div>
                  @if (r.gstin) { <div class="sa-rest-meta">GST: {{ r.gstin }}</div> }
                </td>
                <td><span class="sa-code-badge">{{ r.code }}</span></td>
                <td>
                  <div class="sa-rest-meta">{{ r.email }}</div>
                  @if (r.phone) { <div class="sa-rest-meta">{{ r.phone }}</div> }
                </td>
                <td>
                  <select class="sa-select-sm" [ngModel]="r.plan" (ngModelChange)="setPlan(r, $event)">
                    <option>BASIC</option><option>STANDARD</option><option>PREMIUM</option>
                  </select>
                </td>
                <td>
                  <span class="sa-table-limit">{{ r.tableLimit }}</span>
                </td>
                <td>
                  <span class="sa-status-badge" [class.active]="r.status==='ACTIVE'" [class.suspended]="r.status!=='ACTIVE'">
                    {{ r.status }}
                  </span>
                </td>
                <td>
                  <div class="sa-actions-row">
                    <button class="sa-icon-btn sa-icon-btn-blue" title="Edit restaurant" (click)="openEdit(r)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="sa-icon-btn sa-icon-btn-purple" title="Manage users" (click)="openUsers(r)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </button>
                    <button class="sa-icon-btn" [class.sa-icon-btn-amber]="r.status==='ACTIVE'" [class.sa-icon-btn-green]="r.status!=='ACTIVE'"
                      [title]="r.status === 'ACTIVE' ? 'Suspend' : 'Activate'" (click)="toggle(r)">
                      @if (r.status === 'ACTIVE') {
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                      } @else {
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      }
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="sa-empty-row">No restaurants yet. Create one below.</td></tr>
            }
          </tbody>
        </table>
      </div>

      <!-- ── Create Restaurant Form ── -->
      <div class="sa-card sa-form-card" id="create-form">
        <div class="sa-form-header">
          <div class="sa-form-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <div>
            <h3 class="sa-form-title">Create New Restaurant</h3>
            <p class="sa-form-sub">Fill all details to onboard a new restaurant with its owner account</p>
          </div>
        </div>

        <div class="sa-form-section-lbl">Restaurant Details</div>
        <div class="sa-form-grid">
          <div class="sa-field">
            <label class="sa-label">Restaurant Name *</label>
            <input class="sa-input" placeholder="e.g. The Food Factory" [(ngModel)]="form.name">
          </div>
          <div class="sa-field">
            <label class="sa-label">Restaurant Code *</label>
            <input class="sa-input" placeholder="e.g. R103 (unique, alphanumeric)" [(ngModel)]="form.code">
          </div>
          <div class="sa-field">
            <label class="sa-label">Business Email *</label>
            <input class="sa-input" type="email" placeholder="restaurant@example.com" [(ngModel)]="form.email">
          </div>
          <div class="sa-field">
            <label class="sa-label">Mobile / Phone *</label>
            <input class="sa-input" placeholder="e.g. 9876543210" [(ngModel)]="form.phone">
          </div>
          <div class="sa-field sa-field-full">
            <label class="sa-label">Address *</label>
            <input class="sa-input" placeholder="Full address including city, state" [(ngModel)]="form.address">
          </div>
          <div class="sa-field">
            <label class="sa-label">GSTIN</label>
            <input class="sa-input" placeholder="e.g. 29AABCU9603R1ZM" [(ngModel)]="form.gstin">
          </div>
          <div class="sa-field">
            <label class="sa-label">Website</label>
            <input class="sa-input" placeholder="https://example.com" [(ngModel)]="form.website">
          </div>
          <div class="sa-field">
            <label class="sa-label">Tax % (GST)</label>
            <input class="sa-input" type="number" min="0" max="30" placeholder="5" [(ngModel)]="form.taxPercent">
          </div>
          <div class="sa-field">
            <label class="sa-label">Service Charge %</label>
            <input class="sa-input" type="number" min="0" max="30" placeholder="0" [(ngModel)]="form.serviceChargePercent">
          </div>
        </div>

        <div class="sa-form-section-lbl" style="margin-top:1.5rem">Subscription & Limits</div>
        <div class="sa-form-grid">
          <div class="sa-field">
            <label class="sa-label">Plan</label>
            <select class="sa-input" [(ngModel)]="form.plan">
              <option>BASIC</option><option>STANDARD</option><option>PREMIUM</option>
            </select>
          </div>
          <div class="sa-field">
            <label class="sa-label">Table Limit</label>
            <input class="sa-input" type="number" min="1" max="500" [(ngModel)]="form.tableLimit">
          </div>
        </div>

        <div class="sa-form-section-lbl" style="margin-top:1.5rem">Owner Account</div>
        <div class="sa-form-grid">
          <div class="sa-field">
            <label class="sa-label">Owner Full Name *</label>
            <input class="sa-input" placeholder="e.g. Ramesh Kumar" [(ngModel)]="form.ownerName">
          </div>
          <div class="sa-field">
            <label class="sa-label">Owner Login Email *</label>
            <input class="sa-input" type="email" placeholder="owner@example.com" [(ngModel)]="form.ownerEmail">
          </div>
          <div class="sa-field">
            <label class="sa-label">Owner Password * (min 8 chars)</label>
            <input class="sa-input" type="password" placeholder="Secure password" [(ngModel)]="form.ownerPassword">
          </div>
        </div>

        @if (msg()) {
          <div class="sa-alert" [class.sa-alert-error]="msgType() === 'error'" [class.sa-alert-success]="msgType() === 'success'">
            {{ msg() }}
          </div>
        }
        <div class="sa-form-footer">
          <button class="sa-btn-primary sa-btn-lg" (click)="create()" [disabled]="creating()">
            @if (creating()) { Creating... } @else { Create Restaurant }
          </button>
        </div>
      </div>

    </div><!-- /sa-body -->
  </div><!-- /sa-root -->

  <!-- ═══ Edit Restaurant Modal ═══ -->
  @if (editModal()) {
    <div class="sa-overlay" (click)="closeEdit()">
      <div class="sa-modal sa-modal-lg" (click)="$event.stopPropagation()">
        <div class="sa-modal-header">
          <div>
            <h3 class="sa-modal-title">Edit Restaurant</h3>
            <p class="sa-modal-sub">{{ editTarget()?.name }} · {{ editTarget()?.code }}</p>
          </div>
          <button class="sa-modal-close" (click)="closeEdit()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="sa-modal-body">
          <div class="sa-form-section-lbl">Restaurant Details</div>
          <div class="sa-form-grid">
            <div class="sa-field">
              <label class="sa-label">Name</label>
              <input class="sa-input" [(ngModel)]="editForm.name">
            </div>
            <div class="sa-field">
              <label class="sa-label">Business Email</label>
              <input class="sa-input" type="email" [(ngModel)]="editForm.email">
            </div>
            <div class="sa-field">
              <label class="sa-label">Mobile / Phone</label>
              <input class="sa-input" [(ngModel)]="editForm.phone">
            </div>
            <div class="sa-field sa-field-full">
              <label class="sa-label">Address</label>
              <input class="sa-input" [(ngModel)]="editForm.address">
            </div>
            <div class="sa-field">
              <label class="sa-label">GSTIN</label>
              <input class="sa-input" placeholder="e.g. 29AABCU9603R1ZM" [(ngModel)]="editForm.gstin">
            </div>
            <div class="sa-field">
              <label class="sa-label">Website</label>
              <input class="sa-input" placeholder="https://" [(ngModel)]="editForm.website">
            </div>
            <div class="sa-field">
              <label class="sa-label">Tax % (GST)</label>
              <input class="sa-input" type="number" min="0" max="30" [(ngModel)]="editForm.taxPercent">
            </div>
            <div class="sa-field">
              <label class="sa-label">Service Charge %</label>
              <input class="sa-input" type="number" min="0" max="30" [(ngModel)]="editForm.serviceChargePercent">
            </div>
          </div>
          <div class="sa-form-section-lbl" style="margin-top:1.25rem">Subscription & Status</div>
          <div class="sa-form-grid">
            <div class="sa-field">
              <label class="sa-label">Plan</label>
              <select class="sa-input" [(ngModel)]="editForm.plan">
                <option>BASIC</option><option>STANDARD</option><option>PREMIUM</option>
              </select>
            </div>
            <div class="sa-field">
              <label class="sa-label">Table Limit</label>
              <input class="sa-input" type="number" min="1" max="500" [(ngModel)]="editForm.tableLimit">
            </div>
            <div class="sa-field">
              <label class="sa-label">Status</label>
              <select class="sa-input" [(ngModel)]="editForm.status">
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </select>
            </div>
          </div>
          @if (editMsg()) {
            <div class="sa-alert" [class.sa-alert-error]="editMsgType() === 'error'" [class.sa-alert-success]="editMsgType() === 'success'">
              {{ editMsg() }}
            </div>
          }
        </div>
        <div class="sa-modal-footer">
          <button class="sa-btn-ghost" (click)="closeEdit()">Cancel</button>
          <button class="sa-btn-primary" (click)="saveEdit()" [disabled]="saving()">
            {{ saving() ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  }

  <!-- ═══ Manage Users Modal ═══ -->
  @if (usersModal()) {
    <div class="sa-overlay" (click)="closeUsers()">
      <div class="sa-modal sa-modal-lg" (click)="$event.stopPropagation()">
        <div class="sa-modal-header">
          <div>
            <h3 class="sa-modal-title">Manage Users</h3>
            <p class="sa-modal-sub">{{ usersTarget()?.name }} — owners, managers, waiters, kitchen staff</p>
          </div>
          <button class="sa-modal-close" (click)="closeUsers()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="sa-modal-body">

          <!-- Existing users list -->
          <div class="sa-user-list">
            @for (u of restaurantUsers(); track u._id) {
              <div class="sa-user-row">
                <div class="sa-user-ava-sm" [class]="roleAvaClass(u.role)">{{ u.name[0] }}</div>
                <div class="sa-user-info-col">
                  <div class="sa-user-row-name">{{ u.name }}</div>
                  <div class="sa-user-row-email">{{ u.email }}</div>
                </div>
                <span class="sa-role-badge" [class]="roleBadgeClass(u.role)">{{ u.role }}</span>
                <span class="sa-status-dot" [class.active]="u.isActive" [class.inactive]="!u.isActive"
                  [title]="u.isActive ? 'Active' : 'Inactive'"></span>
                <button class="sa-icon-btn sa-icon-btn-blue" title="Edit user" (click)="openEditUser(u)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            } @empty {
              <div class="sa-empty-row">No users found for this restaurant.</div>
            }
          </div>

          <!-- Add new user -->
          <div class="sa-form-section-lbl" style="margin-top:1.25rem">
            {{ editingUser() ? 'Edit User' : 'Add New User' }}
          </div>
          <div class="sa-form-grid">
            <div class="sa-field">
              <label class="sa-label">Full Name *</label>
              <input class="sa-input" placeholder="e.g. Suresh Manager" [(ngModel)]="userForm.name">
            </div>
            <div class="sa-field">
              <label class="sa-label">Email *</label>
              <input class="sa-input" type="email" placeholder="user@restaurant.com" [(ngModel)]="userForm.email">
            </div>
            <div class="sa-field">
              <label class="sa-label">Password {{ editingUser() ? '(leave blank to keep)' : '*' }}</label>
              <input class="sa-input" type="password" placeholder="Min 8 characters" [(ngModel)]="userForm.password">
            </div>
            <div class="sa-field">
              <label class="sa-label">Role *</label>
              <select class="sa-input" [(ngModel)]="userForm.role">
                <option value="OWNER">OWNER</option>
                <option value="MANAGER">MANAGER</option>
                <option value="WAITER">WAITER</option>
                <option value="KITCHEN">KITCHEN</option>
              </select>
            </div>
          </div>
          @if (usersMsg()) {
            <div class="sa-alert" [class.sa-alert-error]="usersMsgType() === 'error'" [class.sa-alert-success]="usersMsgType() === 'success'">
              {{ usersMsg() }}
            </div>
          }
        </div>
        <div class="sa-modal-footer">
          @if (editingUser()) {
            <button class="sa-btn-ghost" (click)="cancelEditUser()">Cancel Edit</button>
            <button class="sa-btn-primary" (click)="saveUser()" [disabled]="savingUser()">
              {{ savingUser() ? 'Saving...' : 'Update User' }}
            </button>
          } @else {
            <button class="sa-btn-ghost" (click)="closeUsers()">Close</button>
            <button class="sa-btn-primary" (click)="saveUser()" [disabled]="savingUser()">
              {{ savingUser() ? 'Adding...' : 'Add User' }}
            </button>
          }
        </div>
      </div>
    </div>
  }
  `,
  styles: [`
    :host {
      --c-bg: #f4f6fb;
      --c-card: #ffffff;
      --c-border: #e5e7eb;
      --c-text: #111827;
      --c-muted: #6b7280;
      --c-accent: #4f46e5;
      --c-accent-dk: #3730a3;
      --c-success: #059669;
      --c-danger: #dc2626;
      --c-amber: #d97706;
      --c-purple: #7c3aed;
      --radius: 10px;
      --radius-sm: 6px;
      display: block;
      min-height: 100vh;
      background: var(--c-bg);
      font-family: 'Inter', system-ui, sans-serif;
      color: var(--c-text);
      font-size: 14px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Header ── */
    .sa-header {
      background: #fff;
      border-bottom: 1px solid var(--c-border);
      position: sticky; top: 0; z-index: 100;
    }
    .sa-header-inner {
      max-width: 1200px; margin: 0 auto;
      padding: .875rem 1.5rem;
      display: flex; align-items: center; justify-content: space-between;
    }
    .sa-brand { display: flex; align-items: center; gap: .75rem; }
    .sa-brand-icon {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      display: flex; align-items: center; justify-content: center; color: #fff;
    }
    .sa-brand-name { font-size: 1rem; font-weight: 700; color: var(--c-text); }
    .sa-brand-sub { font-size: .72rem; color: var(--c-muted); }
    .sa-header-right { display: flex; align-items: center; gap: .75rem; }
    .sa-user-chip { display: flex; align-items: center; gap: .5rem; }
    .sa-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: .7rem; font-weight: 700;
    }
    .sa-user-label { font-size: .78rem; font-weight: 600; color: var(--c-muted); }
    .sa-logout-btn {
      display: flex; align-items: center; gap: .4rem;
      padding: .4rem .875rem; border: 1px solid var(--c-border);
      border-radius: var(--radius-sm); background: #fff;
      color: var(--c-muted); font-size: .78rem; cursor: pointer;
      transition: all .15s;
    }
    .sa-logout-btn:hover { border-color: #9ca3af; color: var(--c-text); }

    /* ── Body ── */
    .sa-body { max-width: 1200px; margin: 0 auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }

    /* ── Stats ── */
    .sa-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: .875rem;
    }
    .sa-stat-card {
      background: #fff; border: 1px solid var(--c-border); border-radius: var(--radius);
      padding: 1rem 1.25rem; display: flex; align-items: center; gap: .875rem;
    }
    .sa-stat-icon {
      width: 38px; height: 38px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .sa-icon-blue   { background: #eff6ff; color: #2563eb; }
    .sa-icon-green  { background: #f0fdf4; color: #16a34a; }
    .sa-icon-purple { background: #f5f3ff; color: #7c3aed; }
    .sa-icon-amber  { background: #fffbeb; color: #d97706; }
    .sa-icon-rose   { background: #fff1f2; color: #e11d48; }
    .sa-stat-val { font-size: 1.25rem; font-weight: 700; color: var(--c-text); }
    .sa-stat-lbl { font-size: .72rem; color: var(--c-muted); margin-top: .1rem; }

    /* ── Section header ── */
    .sa-section-hdr {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
    }
    .sa-section-title { font-size: 1.1rem; font-weight: 700; color: var(--c-text); }
    .sa-section-sub { font-size: .78rem; color: var(--c-muted); margin-top: .15rem; }

    /* ── Card ── */
    .sa-card {
      background: #fff; border: 1px solid var(--c-border); border-radius: var(--radius);
      overflow: hidden;
    }

    /* ── Table ── */
    .sa-table-wrap { overflow-x: auto; }
    .sa-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
    .sa-table th {
      padding: .75rem 1rem; text-align: left; font-weight: 600; font-size: .72rem;
      text-transform: uppercase; letter-spacing: .04em;
      color: var(--c-muted); background: #f9fafb;
      border-bottom: 1px solid var(--c-border);
    }
    .sa-table td {
      padding: .875rem 1rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle;
    }
    .sa-table tr:last-child td { border-bottom: none; }
    .sa-table tr:hover td { background: #f9fafb; }
    .sa-rest-name { font-weight: 600; color: var(--c-text); }
    .sa-rest-meta { font-size: .72rem; color: var(--c-muted); margin-top: .1rem; }
    .sa-code-badge {
      display: inline-block; padding: .2rem .6rem;
      background: #f5f3ff; color: #6d28d9;
      border-radius: 4px; font-size: .72rem; font-weight: 600; font-family: monospace;
    }
    .sa-table-limit { font-weight: 600; }
    .sa-select-sm {
      padding: .3rem .5rem; border: 1px solid var(--c-border); border-radius: var(--radius-sm);
      font-size: .78rem; background: #fff; color: var(--c-text); cursor: pointer; min-width: 90px;
    }
    .sa-status-badge {
      display: inline-block; padding: .25rem .65rem; border-radius: 20px;
      font-size: .68rem; font-weight: 700; letter-spacing: .03em;
    }
    .sa-status-badge.active   { background: #d1fae5; color: #065f46; }
    .sa-status-badge.suspended { background: #fee2e2; color: #991b1b; }

    .sa-actions-row { display: flex; align-items: center; gap: .4rem; justify-content: flex-end; }
    .sa-icon-btn {
      width: 30px; height: 30px; border-radius: var(--radius-sm);
      border: 1px solid var(--c-border); background: #fff;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all .15s; color: var(--c-muted);
    }
    .sa-icon-btn:hover { border-color: currentColor; }
    .sa-icon-btn-blue   { color: #2563eb; }
    .sa-icon-btn-purple { color: #7c3aed; }
    .sa-icon-btn-amber  { color: #d97706; }
    .sa-icon-btn-green  { color: #16a34a; }
    .sa-empty-row { text-align: center; padding: 2rem; color: var(--c-muted); }

    /* ── Form Card ── */
    .sa-form-card { padding: 1.5rem; }
    .sa-form-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
    .sa-form-icon {
      width: 42px; height: 42px; border-radius: 10px;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0;
    }
    .sa-form-title { font-size: 1rem; font-weight: 700; }
    .sa-form-sub { font-size: .78rem; color: var(--c-muted); margin-top: .2rem; }
    .sa-form-section-lbl {
      font-size: .72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .06em; color: var(--c-muted);
      margin-bottom: .75rem; padding-bottom: .5rem;
      border-bottom: 1px solid var(--c-border);
    }
    .sa-form-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: .875rem;
    }
    .sa-field { display: flex; flex-direction: column; gap: .35rem; }
    .sa-field-full { grid-column: 1 / -1; }
    .sa-label { font-size: .78rem; font-weight: 600; color: #374151; }
    .sa-input {
      width: 100%; padding: .55rem .75rem;
      border: 1px solid var(--c-border); border-radius: var(--radius-sm);
      font-size: .85rem; color: var(--c-text); background: #fff;
      transition: border-color .15s, box-shadow .15s;
      outline: none;
    }
    .sa-input:focus { border-color: var(--c-accent); box-shadow: 0 0 0 3px rgba(79,70,229,.1); }
    .sa-form-footer { display: flex; justify-content: flex-end; margin-top: 1.5rem; }

    /* ── Buttons ── */
    .sa-btn-primary {
      display: inline-flex; align-items: center; gap: .4rem;
      padding: .55rem 1.25rem; background: var(--c-accent);
      color: #fff; border: none; border-radius: var(--radius-sm);
      font-size: .85rem; font-weight: 600; cursor: pointer; transition: background .15s;
    }
    .sa-btn-primary:hover { background: var(--c-accent-dk); }
    .sa-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .sa-btn-primary.sa-btn-lg { padding: .65rem 1.5rem; }
    .sa-btn-ghost {
      padding: .55rem 1.25rem; background: #fff; color: var(--c-muted);
      border: 1px solid var(--c-border); border-radius: var(--radius-sm);
      font-size: .85rem; cursor: pointer; transition: all .15s;
    }
    .sa-btn-ghost:hover { border-color: #9ca3af; color: var(--c-text); }

    /* ── Alert ── */
    .sa-alert {
      padding: .625rem .875rem; border-radius: var(--radius-sm);
      font-size: .82rem; margin-top: .875rem;
      background: #f0fdf4; color: #065f46; border: 1px solid #bbf7d0;
    }
    .sa-alert-error { background: #fff1f2; color: #9f1239; border-color: #fecdd3; }
    .sa-alert-success { background: #f0fdf4; color: #065f46; border-color: #bbf7d0; }

    /* ── Modals ── */
    .sa-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 500;
      display: flex; align-items: center; justify-content: center; padding: 1rem;
    }
    .sa-modal {
      background: #fff; border-radius: var(--radius); width: 100%;
      max-width: 520px; max-height: 90vh; display: flex; flex-direction: column;
      box-shadow: 0 20px 60px rgba(0,0,0,.18);
    }
    .sa-modal-lg { max-width: 720px; }
    .sa-modal-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--c-border);
    }
    .sa-modal-title { font-size: 1rem; font-weight: 700; }
    .sa-modal-sub { font-size: .78rem; color: var(--c-muted); margin-top: .15rem; }
    .sa-modal-close {
      width: 28px; height: 28px; border: none; background: #f3f4f6;
      border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: var(--c-muted); transition: background .15s;
    }
    .sa-modal-close:hover { background: #e5e7eb; }
    .sa-modal-body { padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; }
    .sa-modal-footer {
      padding: 1rem 1.5rem; border-top: 1px solid var(--c-border);
      display: flex; justify-content: flex-end; gap: .625rem;
    }

    /* ── Users list ── */
    .sa-user-list { display: flex; flex-direction: column; gap: .5rem; }
    .sa-user-row {
      display: flex; align-items: center; gap: .75rem;
      padding: .625rem .875rem; border: 1px solid var(--c-border);
      border-radius: var(--radius-sm); background: #fafafa;
    }
    .sa-user-ava-sm {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: .78rem; font-weight: 700; color: #fff;
      text-transform: uppercase;
    }
    .sa-user-ava-sm.owner   { background: linear-gradient(135deg, #4f46e5, #7c3aed); }
    .sa-user-ava-sm.manager { background: linear-gradient(135deg, #0891b2, #0e7490); }
    .sa-user-ava-sm.waiter  { background: linear-gradient(135deg, #059669, #047857); }
    .sa-user-ava-sm.kitchen { background: linear-gradient(135deg, #d97706, #b45309); }
    .sa-user-info-col { flex: 1; min-width: 0; }
    .sa-user-row-name { font-weight: 600; font-size: .82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sa-user-row-email { font-size: .72rem; color: var(--c-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sa-role-badge {
      padding: .2rem .55rem; border-radius: 4px; font-size: .68rem; font-weight: 700;
      white-space: nowrap; flex-shrink: 0;
    }
    .sa-role-badge.owner   { background: #ede9fe; color: #5b21b6; }
    .sa-role-badge.manager { background: #e0f2fe; color: #0369a1; }
    .sa-role-badge.waiter  { background: #d1fae5; color: #065f46; }
    .sa-role-badge.kitchen { background: #fef3c7; color: #92400e; }
    .sa-status-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .sa-status-dot.active   { background: #10b981; }
    .sa-status-dot.inactive { background: #d1d5db; }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .sa-body { padding: .875rem; gap: 1rem; }
      .sa-header-inner { padding: .75rem 1rem; }
      .sa-stats-grid { grid-template-columns: repeat(2, 1fr); }
      .sa-form-grid { grid-template-columns: 1fr; }
      .sa-user-label { display: none; }
      .sa-table th:nth-child(3), .sa-table td:nth-child(3) { display: none; }
    }
  `]
})
export class SuperadminComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  restaurants = signal<any[]>([]);
  stats       = signal<any>(null);
  msg         = signal('');
  msgType     = signal<'success'|'error'>('success');
  creating    = signal(false);
  form: any   = BLANK_FORM();

  editModal   = signal(false);
  editTarget  = signal<any>(null);
  editForm: any = BLANK_EDIT();
  editMsg     = signal('');
  editMsgType = signal<'success'|'error'>('success');
  saving      = signal(false);

  usersModal      = signal(false);
  usersTarget     = signal<any>(null);
  restaurantUsers = signal<any[]>([]);
  usersMsg        = signal('');
  usersMsgType    = signal<'success'|'error'>('success');
  savingUser      = signal(false);
  editingUser     = signal<any>(null);
  userForm: any   = BLANK_USER();

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

  openCreate() {
    document.getElementById('create-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  create() {
    this.creating.set(true);
    this.msg.set('');
    this.api.post('/admin/restaurants', this.form).subscribe({
      next: () => {
        this.msg.set('Restaurant created successfully!');
        this.msgType.set('success');
        this.form = BLANK_FORM();
        this.load();
        this.creating.set(false);
      },
      error: (e) => {
        this.msg.set(e?.error?.message || 'Failed to create restaurant');
        this.msgType.set('error');
        this.creating.set(false);
      }
    });
  }

  /* ── Edit restaurant ── */
  openEdit(r: any) {
    this.editTarget.set(r);
    this.editForm = {
      name: r.name, email: r.email, phone: r.phone || '', address: r.address || '',
      gstin: r.gstin || '', website: r.website || '',
      serviceChargePercent: r.serviceChargePercent || 0,
      taxPercent: r.taxPercent || 5,
      plan: r.plan, tableLimit: r.tableLimit, status: r.status
    };
    this.editMsg.set('');
    this.editModal.set(true);
  }

  closeEdit() { this.editModal.set(false); }

  saveEdit() {
    this.saving.set(true);
    this.editMsg.set('');
    const id = this.editTarget()?._id;
    this.api.patch(`/admin/restaurants/${id}`, this.editForm).subscribe({
      next: () => {
        this.editMsg.set('Restaurant updated successfully!');
        this.editMsgType.set('success');
        this.saving.set(false);
        this.load();
        setTimeout(() => this.closeEdit(), 1200);
      },
      error: (e) => {
        this.editMsg.set(e?.error?.message || 'Update failed');
        this.editMsgType.set('error');
        this.saving.set(false);
      }
    });
  }

  /* ── Manage users ── */
  openUsers(r: any) {
    this.usersTarget.set(r);
    this.usersMsg.set('');
    this.userForm = BLANK_USER();
    this.editingUser.set(null);
    this.loadUsers(r._id);
    this.usersModal.set(true);
  }

  closeUsers() { this.usersModal.set(false); }

  loadUsers(id: string) {
    this.api.get<any[]>(`/admin/restaurants/${id}/users`).subscribe(({ data }) => this.restaurantUsers.set(data));
  }

  openEditUser(u: any) {
    this.editingUser.set(u);
    this.userForm = { name: u.name, email: u.email, password: '', role: u.role };
    this.usersMsg.set('');
  }

  cancelEditUser() {
    this.editingUser.set(null);
    this.userForm = BLANK_USER();
    this.usersMsg.set('');
  }

  saveUser() {
    const id = this.usersTarget()?._id;
    this.savingUser.set(true);
    this.usersMsg.set('');
    if (this.editingUser()) {
      const uid = this.editingUser()._id;
      const payload: any = { name: this.userForm.name, email: this.userForm.email, role: this.userForm.role };
      if (this.userForm.password) payload.password = this.userForm.password;
      this.api.patch(`/admin/restaurants/${id}/users/${uid}`, payload).subscribe({
        next: () => {
          this.usersMsg.set('User updated!');
          this.usersMsgType.set('success');
          this.savingUser.set(false);
          this.editingUser.set(null);
          this.userForm = BLANK_USER();
          this.loadUsers(id);
        },
        error: (e) => {
          this.usersMsg.set(e?.error?.message || 'Failed');
          this.usersMsgType.set('error');
          this.savingUser.set(false);
        }
      });
    } else {
      this.api.post(`/admin/restaurants/${id}/users`, this.userForm).subscribe({
        next: () => {
          this.usersMsg.set('User added successfully!');
          this.usersMsgType.set('success');
          this.savingUser.set(false);
          this.userForm = BLANK_USER();
          this.loadUsers(id);
        },
        error: (e) => {
          this.usersMsg.set(e?.error?.message || 'Failed');
          this.usersMsgType.set('error');
          this.savingUser.set(false);
        }
      });
    }
  }

  roleAvaClass(role: string): string {
    const m: Record<string,string> = { OWNER: 'owner', MANAGER: 'manager', WAITER: 'waiter', KITCHEN: 'kitchen' };
    return m[role] || 'waiter';
  }

  roleBadgeClass(role: string): string {
    const m: Record<string,string> = { OWNER: 'owner', MANAGER: 'manager', WAITER: 'waiter', KITCHEN: 'kitchen' };
    return 'sa-role-badge ' + (m[role] || '');
  }
}
