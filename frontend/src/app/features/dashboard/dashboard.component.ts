import { Component, OnInit, OnDestroy, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth.service';
import { OutletService, Outlet } from '../../core/services/outlet.service';
import { MenuService } from '../../core/services/menu.service';
import { MenuListComponent } from './menu-list.component';
import { CategoryManagerComponent } from './category-manager.component';
import { TableManagementComponent } from './table-management.component';
import { StaffManagementComponent } from './staff-management.component';
import { ImageUploadComponent } from '../../shared/components/image-upload.component';
import { ThemeService } from '../../core/services/theme.service';
import { WorkingModeService } from '../../core/services/working-mode.service';
import { NotificationSoundService } from '../../core/services/notification-sound.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, MenuListComponent, CategoryManagerComponent, TableManagementComponent, StaffManagementComponent, ImageUploadComponent],
  template: `
    <div class="dashboard">

      <!-- ── Header ── -->
      <header class="dash-header">
        <div class="dash-header-inner">
          <div class="brand">
            @if (restaurantInfo()?.logoUrl) {
              <img class="brand-logo" [src]="restaurantInfo()!.logoUrl" [alt]="restaurantInfo()!.name">
            } @else {
              <div class="brand-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
                  <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
                  <path d="M8 9V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </div>
            }
            <div>
              <div class="brand-name">{{ restaurantInfo()?.name || 'RestaurantOS' }}</div>
              <div class="brand-sub">{{ restaurantInfo()?.address || 'Intelligent Restaurant Management' }}</div>
            </div>
          </div>

          <div class="header-right">
            <!-- Working Mode toggle (Owner & Waiter only) -->
            <button *ngIf="canUseWorkingMode()" class="hdr-toggle" [class.hdr-toggle-on]="workingMode.enabled()" (click)="workingMode.toggle()"
              [title]="workingMode.enabled() ? 'Switch to Normal Mode' : 'Switch to Working Mode'">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.2 4.2l4.3 4.3M15.5 15.5l4.3 4.3M1 12h6M17 12h6M4.2 19.8l4.3-4.3M15.5 8.5l4.3-4.3"/>
              </svg>
              <span class="hdr-toggle-label">{{ workingMode.enabled() ? 'Working' : 'Normal' }}</span>
            </button>
            <!-- Dark / light theme toggle -->
            <button class="hdr-icon-btn" (click)="theme.toggle()" [title]="theme.theme() === 'dark' ? 'Light mode' : 'Dark mode'" aria-label="Toggle theme">
              @if (theme.theme() === 'dark') {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>
                </svg>
              } @else {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              }
            </button>
            <div class="user-chip">
              <div class="user-ava">{{ getInitials() }}</div>
              <div class="user-info">
                <span class="user-name">{{ auth.user()?.name }}</span>
                <span class="user-role" [class]="getRoleClass()">{{ auth.user()?.role }}</span>
              </div>
            </div>
            <button class="btn-logout" (click)="auth.logout()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span class="logout-label">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <!-- ── Nav ── -->
      <nav class="dash-nav">
        <div class="dash-nav-inner">
          <button class="nav-tab" [class.active]="activeTab() === 'orders'" (click)="activeTab.set('orders')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            Orders
            <span class="nav-pill" *ngIf="activeOrdersCount() > 0">{{ activeOrdersCount() }}</span>
          </button>
          <button *ngIf="!inWorkingMode()" class="nav-tab" [class.active]="activeTab() === 'tables'" (click)="activeTab.set('tables')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
              <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
              <circle cx="12" cy="13" r="2"/>
            </svg>
            Tables
          </button>
          <button *ngIf="!inWorkingMode()" class="nav-tab" [class.active]="activeTab() === 'menu'" (click)="activeTab.set('menu')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Menu
          </button>
          <button *ngIf="!inWorkingMode()" class="nav-tab" [class.active]="activeTab() === 'tips'" (click)="activeTab.set('tips'); loadTips()">
            💝 Tips
            <span class="nav-pill" *ngIf="tipsTotal() > 0">₹{{ tipsTotal() | number:'1.0-0' }}</span>
          </button>
          <button *ngIf="isManager() && !inWorkingMode()" class="nav-tab" [class.active]="activeTab() === 'staff'" (click)="activeTab.set('staff')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Staff
          </button>
          <button *ngIf="isManager() && !inWorkingMode()" class="nav-tab" [class.active]="activeTab() === 'favorites'" (click)="activeTab.set('favorites'); loadFavorites()">
            ⭐ Favorites
          </button>
          <button *ngIf="isManager() && !inWorkingMode()" class="nav-tab" [class.active]="activeTab() === 'discounts'" (click)="activeTab.set('discounts'); loadDiscounts(); loadDiscountsByCustomer()">
            🏷️ Discounts
          </button>
          <button *ngIf="isManager() && !inWorkingMode()" class="nav-tab" [class.active]="activeTab() === 'analytics'" (click)="activeTab.set('analytics'); loadOverview()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            Analytics
          </button>
          <button *ngIf="auth.user()?.role === 'OWNER' && !inWorkingMode()" class="nav-tab" [class.active]="activeTab() === 'outlets'" (click)="activeTab.set('outlets'); loadOutlets()">
            🏪 Outlets
          </button>
          <span *ngIf="inWorkingMode()" class="working-badge">
            <span class="working-dot"></span> Working Mode
          </span>

          <!-- Outlet selector (OWNER/MANAGER) -->
          <div *ngIf="isManager() && outlets().length > 0" class="outlet-selector-wrap" style="margin-left:auto;display:flex;align-items:center;gap:8px;">
            <label style="font-size:12px;color:#6b7280;white-space:nowrap;">Viewing:</label>
            <select class="outlet-select" (change)="selectOutlet($any($event.target).value || null)" style="font-size:13px;padding:4px 10px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;">
              <option value="">All Outlets</option>
              @for (o of outlets(); track o._id) {
                <option [value]="o._id" [selected]="selectedOutletId() === o._id">{{ o.name }}</option>
              }
            </select>
          </div>

          <!-- Waiter notification bell -->
          <button *ngIf="auth.user()?.role === 'WAITER'" class="nav-tab notif-bell" (click)="showNotifications.set(!showNotifications())" style="position:relative;margin-left:auto;">
            🔔Notification
            <span *ngIf="pendingServiceOrders().length > 0" class="nav-pill">{{ pendingServiceOrders().length }}</span>
          </button>
        </div>

        <!-- Waiter notification panel -->
        @if (showNotifications() && pendingServiceOrders().length > 0) {
          <div class="notif-panel" style="position:fixed;top:110px;right:20px;width:340px;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.15);z-index:1000;padding:16px;max-height:480px;overflow-y:auto;">
            <div style="font-weight:700;font-size:14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
              Orders Ready to Serve
              <button (click)="showNotifications.set(false)" style="background:none;border:none;cursor:pointer;font-size:18px;color:#9ca3af;">×</button>
            </div>
            @for (n of pendingServiceOrders(); track n.orderId) {
              <div style="background:#f9fafb;border-radius:8px;padding:12px;margin-bottom:8px;border-left:4px solid #10b981;">
                <div style="font-weight:600;font-size:13px;">Order #{{ n.orderNumber }} — {{ n.tableName }}</div>
                <div style="font-size:12px;color:#6b7280;margin:4px 0;">{{ n.outletName }}</div>
                <div style="font-size:12px;color:#374151;margin-bottom:8px;">
                  @for (item of n.items; track $index) {<span>{{ item.name }} ×{{ item.qty }}</span>@if (!$last) {<span>, </span>}}
                </div>
                <div style="display:flex;gap:8px;">
                  <button (click)="markServed(n)" style="flex:1;background:#10b981;color:#fff;border:none;border-radius:6px;padding:6px;font-size:12px;cursor:pointer;font-weight:600;">✓ Mark Served</button>
                  <button (click)="dismissNotification(n.orderId)" style="background:#f3f4f6;border:none;border-radius:6px;padding:6px 10px;font-size:12px;cursor:pointer;">Dismiss</button>
                </div>
              </div>
            }
          </div>
        }
      </nav>

      <!-- ═══ Waiter "Order Ready" centered popup ═══ -->
      @if (isWaiter() && activeReady(); as ready) {
        <div class="ready-overlay">
          <div class="ready-modal" role="dialog" aria-modal="true">
            <div class="ready-modal-head">
              <div class="ready-pulse">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div class="ready-head-text">
                <div class="ready-title">Order Ready to Serve</div>
                <div class="ready-sub">The kitchen has finished preparing this order.</div>
              </div>
              <button class="ready-close" (click)="closeReadyPopup(ready)" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div class="ready-modal-body">
              <div class="ready-meta-grid">
                <div class="ready-meta"><span>Order</span><strong>#{{ ready.orderNumber }}</strong></div>
                <div class="ready-meta"><span>Table</span><strong>{{ ready.tableName }}</strong></div>
                @if (ready.customerName) {
                  <div class="ready-meta"><span>Customer</span><strong>{{ ready.customerName }}</strong></div>
                }
                <div class="ready-meta"><span>Time</span><strong>{{ ready.createdAt ? (ready.createdAt | date:'hh:mm a') : (ready.timestamp | date:'hh:mm a') }}</strong></div>
              </div>

              <div class="ready-items">
                @for (item of ready.items; track $index) {
                  <div class="ready-item">
                    <span class="ready-item-qty">{{ item.qty }}×</span>
                    <span class="ready-item-name">
                      {{ item.name }}
                      @if (item.variant) { <span class="ready-item-var">({{ item.variant }})</span> }
                      @if (item.notes) { <span class="ready-item-note">📝 {{ item.notes }}</span> }
                    </span>
                    @if (item.lineTotal != null) { <span class="ready-item-price">₹{{ item.lineTotal }}</span> }
                  </div>
                }
              </div>

              @if (ready.total != null) {
                <div class="ready-total"><span>Total</span><strong>₹{{ ready.total }}</strong></div>
              }

              @if (readyQueue().length > 1) {
                <div class="ready-queue-hint">+ {{ readyQueue().length - 1 }} more order{{ readyQueue().length - 1 !== 1 ? 's' : '' }} ready</div>
              }
            </div>

            <div class="ready-modal-foot">
              <button class="ready-btn-cancel" (click)="cancelReady(ready)">Cancel Order</button>
              <button class="ready-btn-complete" (click)="completeReady(ready)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Complete Order
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ── Main ── -->
      <main class="dash-main">

        <!-- ════════ ORDERS TAB ════════ -->
        @if (activeTab() === 'orders') {
          <div class="orders-view">

            @if (isManager() && !inWorkingMode()) {
              <!-- Analytics outlet selector for OWNER -->
              @if (auth.user()?.role === 'OWNER' && outlets().length > 1) {
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
                  <span style="font-size:12px;color:#6b7280;font-weight:500;">Analytics for:</span>
                  <select
                    style="font-size:13px;padding:5px 14px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-weight:500;"
                    (change)="selectOutlet($any($event.target).value || null)">
                    <option value="">All Outlets (Combined)</option>
                    @for (o of outlets(); track o._id) {
                      <option [value]="o._id" [selected]="selectedOutletId() === o._id">{{ o.name }}</option>
                    }
                  </select>
                  @if (selectedOutletId()) {
                    <span style="font-size:11px;color:#6366f1;font-weight:600;background:#eef2ff;padding:3px 10px;border-radius:20px;">
                      Showing: {{ getOutletName(selectedOutletId()!) }}
                    </span>
                  } @else {
                    <span style="font-size:11px;color:#10b981;font-weight:600;background:#d1fae5;padding:3px 10px;border-radius:20px;">
                      Showing: All Outlets Combined
                    </span>
                  }
                </div>
              }

              <!-- KPI Row -->
              <div class="kpi-row">
                <div class="kpi-card" style="--accent:#6366f1;--accent-bg:#eef2ff">
                  <div class="kpi-icon-wrap">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                  <div class="kpi-info">
                    <div class="kpi-num">₹{{ (sales()?.summary?.revenue || 0) | number:'1.0-0' }}</div>
                    <div class="kpi-lbl">Total Revenue</div>
                    <div class="kpi-meta">{{ periodLabels[selectedPeriod] }}</div>
                  </div>
                </div>

                <div class="kpi-card" style="--accent:#10b981;--accent-bg:#d1fae5">
                  <div class="kpi-icon-wrap">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="2" y="7" width="20" height="14" rx="2"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                  </div>
                  <div class="kpi-info">
                    <div class="kpi-num">{{ sales()?.summary?.orders || 0 }}</div>
                    <div class="kpi-lbl">Total Orders</div>
                    <div class="kpi-meta">{{ activeOrdersCount() }} active now</div>
                  </div>
                </div>

                <div class="kpi-card" style="--accent:#f59e0b;--accent-bg:#fef3c7">
                  <div class="kpi-icon-wrap">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  </div>
                  <div class="kpi-info">
                    <div class="kpi-num">₹{{ (sales()?.summary?.avgOrderValue || 0) | number:'1.0-0' }}</div>
                    <div class="kpi-lbl">Avg Order Value</div>
                    <div class="kpi-meta">Per paid order</div>
                  </div>
                </div>

                <div class="kpi-card" style="--accent:#ef4444;--accent-bg:#fee2e2">
                  <div class="kpi-icon-wrap">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="2" y="3" width="20" height="14" rx="2"/>
                      <path d="M8 21h8M12 17v4"/>
                    </svg>
                  </div>
                  <div class="kpi-info">
                    <div class="kpi-num">₹{{ (sales()?.summary?.tax || 0) | number:'1.0-0' }}</div>
                    <div class="kpi-lbl">Tax Collected</div>
                    <div class="kpi-meta">GST / VAT</div>
                  </div>
                </div>
              </div>

              <!-- Period Selector -->
              <div class="period-bar">
                <button *ngFor="let p of periods" class="period-btn"
                  [class.active]="selectedPeriod === p.value"
                  (click)="setPeriod(p.value)">
                  {{ p.label }}
                </button>
              </div>

              <!-- Charts 2×2 -->
              <div class="charts-grid">

                <!-- Revenue Trend -->
                <div class="chart-box span-2">
                  <div class="chart-box-head">
                    <div>
                      <div class="chart-box-title">Revenue Trend</div>
                      <div class="chart-box-sub">Daily revenue & orders — {{ periodLabels[selectedPeriod] }}</div>
                    </div>
                    <span class="chart-tag">{{ periodLabels[selectedPeriod] }}</span>
                  </div>
                  <div class="chart-box-body">
                    @if (sales()?.trend?.length) {
                      <canvas id="revenueChart" height="110"></canvas>
                    } @else {
                      <div class="chart-placeholder">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                        <span>No revenue data for this period</span>
                      </div>
                    }
                  </div>
                </div>

                <!-- Top Items -->
                <div class="chart-box">
                  <div class="chart-box-head">
                    <div>
                      <div class="chart-box-title">Top Items</div>
                      <div class="chart-box-sub">Best selling items by quantity</div>
                    </div>
                  </div>
                  <div class="chart-box-body">
                    @if (topItems().length) {
                      <canvas id="itemsChart" height="180"></canvas>
                    } @else {
                      <div class="chart-placeholder">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                        </svg>
                        <span>No item sales data yet</span>
                      </div>
                    }
                  </div>
                </div>

                <!-- Peak Hours -->
                <div class="chart-box">
                  <div class="chart-box-head">
                    <div>
                      <div class="chart-box-title">Peak Hours</div>
                      <div class="chart-box-sub">Order volume by hour of day</div>
                    </div>
                  </div>
                  <div class="chart-box-body">
                    @if (peakHours().length) {
                      <canvas id="hoursChart" height="180"></canvas>
                    } @else {
                      <div class="chart-placeholder">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>No hourly data yet</span>
                      </div>
                    }
                  </div>
                </div>

                <!-- Busiest Days -->
                <div class="chart-box">
                  <div class="chart-box-head">
                    <div>
                      <div class="chart-box-title">Busiest Days</div>
                      <div class="chart-box-sub">Order volume by day of week</div>
                    </div>
                  </div>
                  <div class="chart-box-body">
                    @if (peakDays().length) {
                      <canvas id="daysChart" height="180"></canvas>
                    } @else {
                      <div class="chart-placeholder">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                          <rect x="3" y="4" width="18" height="18" rx="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>No day-wise data yet</span>
                      </div>
                    }
                  </div>
                </div>

              </div><!-- /charts-grid -->
            }

            <!-- Orders Table -->
            <div class="orders-card">
              <div class="orders-card-head">
                <div>
                  <div class="orders-title">Live Orders</div>
                  <div class="orders-sub">Real-time updates · auto-refreshes every 30s</div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                  <!-- Outlet filter dropdown for OWNER -->
                  @if (auth.user()?.role === 'OWNER' && outlets().length > 0) {
                    <select
                      style="font-size:13px;padding:5px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-weight:500;"
                      (change)="selectOutlet($any($event.target).value || null)">
                      @for (o of outlets(); track o._id) {
                        <option [value]="o._id" [selected]="selectedOutletId() === o._id">{{ o.name }}</option>
                      }
                    </select>
                  }
                  <button class="btn-refresh" (click)="loadOrders()">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M23 4v6h-6M1 20v-6h6"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              @if (error()) {
                <div class="err-banner">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {{ error() }}
                  <button (click)="error.set(null)">×</button>
                </div>
              }

              @if (orders().length === 0) {
                <div class="empty-orders">
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
                    <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
                  </svg>
                  <div class="empty-title">No orders yet</div>
                  <div class="empty-desc">Orders will appear here when customers place them via QR code</div>
                </div>
              } @else {
                <div class="table-scroll">
                  <table class="orders-tbl">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Table</th>
                        @if (auth.user()?.role === 'OWNER') { <th>Outlet</th> }
                        <th class="col-cust">Customer</th>
                        <th class="col-items">Items</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th class="col-pay">Payment</th>
                        <th class="col-time">Time</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (order of orders(); track order._id) {
                        <tr>
                          <td><span class="order-num">#{{ order.orderNumber }}</span></td>
                          <td><span class="table-num">T{{ order.tableId?.number || '—' }}</span></td>
                          @if (auth.user()?.role === 'OWNER') {
                            <td><span style="font-size:11px;font-weight:600;color:#6366f1;">{{ getOutletName(order.outletId) }}</span></td>
                          }
                          <td class="col-cust">
                            @if (order.customerSessionId?.customerName || order.customerName) {
                              <div class="cust-cell">
                                <span class="cust-name">{{ order.customerSessionId?.customerName || order.customerName }}</span>
                                <span class="cust-phone">{{ order.customerSessionId?.mobileNumber || order.customerPhone || '' }}</span>
                              </div>
                            } @else { <span class="text-muted">—</span> }
                          </td>
                          <td class="col-items">
                            <div class="items-chips">
                              @for (item of order.items.slice(0, 2); track item._id) {
                                <span class="chip">{{ item.qty }}× {{ item.name }}</span>
                              }
                              @if (order.items.length > 2) {
                                <span class="chip-more">+{{ order.items.length - 2 }}</span>
                              }
                            </div>
                          </td>
                          <td><span class="total-amt">₹{{ order.total | number:'1.0-0' }}</span></td>
                          <td>
                            <span class="status-pill" [attr.data-s]="order.status.toLowerCase()">
                              {{ getStatusIcon(order.status) }} {{ order.status }}
                            </span>
                          </td>
                          <td class="col-pay">
                            <div class="pay-cell">
                              <span class="pay-pill" [class.paid]="order.paymentStatus === 'PAID'" [class.unpaid]="order.paymentStatus !== 'PAID'">
                                {{ order.paymentStatus === 'PAID' ? '✓ Paid' : '○ Unpaid' }}
                              </span>
                              @if (order.paymentMode) {
                                <span class="pay-mode">{{ order.paymentMode }}</span>
                              }
                            </div>
                          </td>
                          <td class="col-time time-ago">{{ getTimeAgo(order.createdAt) }}</td>
                          <td>
                            <div class="action-btns">
                              <button class="btn-action btn-hist" (click)="viewHistory(order)" title="Order history">
                                📋
                              </button>
                              @if (order.status === 'READY_TO_SERVE') {
                                <button class="btn-action" (click)="markOrderServed(order)"
                                  style="background:#10b981;color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer;font-weight:600;white-space:nowrap;">
                                  🍽️ <span class="pay-label">Serve</span>
                                </button>
                              }
                              @if (order.paymentStatus === 'UNPAID' && (order.status === 'READY_TO_SERVE' || order.status === 'SERVED' || order.status === 'PAYMENT_COMPLETED' || order.status === 'COMPLETED')) {
                                <button class="btn-pay btn-action" (click)="openPayModal(order)">
                                  💰 <span class="pay-label">Pay</span>
                                </button>
                              }
                              @if (order.paymentStatus === 'PAID' || order.status === 'SERVED' || order.status === 'PAYMENT_COMPLETED' || order.status === 'COMPLETED' || order.status === 'CLOSED') {
                                <button class="btn-pay btn-receipt btn-action" (click)="viewReceipt(order)">
                                  🧾 <span class="pay-label">Receipt</span>
                                </button>
                              }
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        }

        <!-- ════════ TABLES TAB ════════ -->
        @if (activeTab() === 'tables') {
          <app-table-management></app-table-management>
        }

        <!-- ════════ MENU TAB ════════ -->
        @if (activeTab() === 'menu') {
          <div class="menu-layout">
            <div class="menu-main-col">
              <app-menu-list></app-menu-list>
            </div>
            <div class="menu-side-col">
              <div class="side-card">
                <div class="side-card-head">
                  <div class="side-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <rect x="3" y="3" width="8" height="8" rx="2"/>
                      <rect x="13" y="3" width="8" height="8" rx="2"/>
                      <rect x="3" y="13" width="8" height="8" rx="2"/>
                      <rect x="13" y="13" width="8" height="8" rx="2"/>
                    </svg>
                  </div>
                  <div>
                    <div class="side-title">Categories</div>
                    <div class="side-sub">Organise your menu</div>
                  </div>
                </div>
                <app-category-manager></app-category-manager>
              </div>
            </div>
          </div>
        }

        <!-- ════════ STAFF TAB ════════ -->
        @if (activeTab() === 'staff') {
          <app-staff-management></app-staff-management>
        }

        <!-- ════════ TIPS TAB ════════ -->
        @if (activeTab() === 'tips') {
          <div class="tips-view">
            <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
              <div>
                <h2 style="font-size:18px;font-weight:700;margin:0;">💝 Tips</h2>
                <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">
                  {{ isManager() ? 'Tips received by your staff' : 'Tips your customers gave you' }}
                </p>
              </div>
              <div style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:12px;padding:10px 18px;text-align:right;">
                <div style="font-size:11px;color:#be185d;font-weight:600;text-transform:uppercase;letter-spacing:.3px;">Total Tips</div>
                <div style="font-size:20px;font-weight:800;color:#be185d;">₹{{ tipsTotal() | number:'1.2-2' }}</div>
              </div>
            </div>

            @if (tipsLoading()) {
              <div style="text-align:center;color:#9ca3af;padding:40px;">Loading…</div>
            } @else if (!tips().length) {
              <div style="text-align:center;color:#9ca3af;padding:40px;">No tips yet.</div>
            } @else {
              <div style="overflow-x:auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead>
                    <tr style="background:#f9fafb;text-align:left;color:#6b7280;">
                      <th style="padding:10px 14px;font-weight:600;">Date</th>
                      <th style="padding:10px 14px;font-weight:600;">Time</th>
                      <th style="padding:10px 14px;font-weight:600;">Customer</th>
                      <th style="padding:10px 14px;font-weight:600;">Mobile</th>
                      <th style="padding:10px 14px;font-weight:600;">Items</th>
                      @if (isManager()) { <th style="padding:10px 14px;font-weight:600;">Waiter</th> }
                      <th style="padding:10px 14px;font-weight:600;text-align:right;">Tip</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (t of tips(); track t._id) {
                      <tr style="border-top:1px solid #f3f4f6;">
                        <td style="padding:10px 14px;white-space:nowrap;">{{ t.createdAt | date:'dd MMM yyyy' }}</td>
                        <td style="padding:10px 14px;white-space:nowrap;color:#6b7280;">{{ t.createdAt | date:'hh:mm a' }}</td>
                        <td style="padding:10px 14px;font-weight:600;">{{ t.customerName }}</td>
                        <td style="padding:10px 14px;color:#6b7280;">{{ t.customerPhone }}</td>
                        <td style="padding:10px 14px;color:#6b7280;max-width:260px;">{{ (t.items || []).join(', ') }}</td>
                        @if (isManager()) { <td style="padding:10px 14px;">{{ t.waiterName || '—' }}</td> }
                        <td style="padding:10px 14px;text-align:right;font-weight:700;color:#be185d;white-space:nowrap;">₹{{ t.amount | number:'1.2-2' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        <!-- ════════ FAVORITES TAB ════════ -->
        @if (activeTab() === 'favorites') {
          <div class="fav-view">
            <div class="fav-head">
              <div>
                <h2 class="fav-title">⭐ People's Favorites</h2>
                <p class="fav-sub">Understand what your customers love most</p>
              </div>
              <div class="fav-controls">
                <select class="fav-period-sel" [(ngModel)]="favPeriod" (change)="loadFavorites()">
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
                @if (isOwner() && outlets().length > 1) {
                  <select class="fav-period-sel" [(ngModel)]="favOutletId" (change)="loadFavorites()">
                    <option value="">All Outlets</option>
                    @for (o of outlets(); track o._id) {
                      <option [value]="o._id">{{ o.name }}</option>
                    }
                  </select>
                }
                <input class="fav-search" type="text" placeholder="Search item…" [(ngModel)]="favItemSearch" (input)="loadFavorites()">
                <button class="btn-export" (click)="exportFavorites()">📥 Export Excel</button>
              </div>
            </div>

            <!-- Bulk discount action bar (appears when customers are selected) -->
            @if (selectedMobiles().size > 0) {
              <div class="fav-bulkbar">
                <span class="fav-bulk-count">{{ selectedMobiles().size }} selected</span>
                <button class="btn-discount" (click)="openAssignDiscount(null)">🏷️ Assign Discount</button>
                <button class="fav-bulk-clear" (click)="clearSelection()">Clear</button>
              </div>
            }

            @if (favLoading()) {
              <div class="fav-loading">Loading analytics…</div>
            } @else if (favRows().length === 0) {
              <div class="fav-empty">No data found for this period.</div>
            } @else {
              <div class="table-scroll">
                <table class="orders-tbl fav-tbl">
                  <thead>
                    <tr>
                      <th class="fav-cb-col"><input type="checkbox" [checked]="allSelected()" (change)="toggleSelectAll($event)" aria-label="Select all"></th>
                      <th>Mobile</th>
                      <th>Customer Name</th>
                      <th>Discounts</th>
                      <th>Favorite Items</th>
                      <th class="kd-num">Total Orders</th>
                      <th class="kd-num">Total Spend</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of favRows(); track row.mobileNumber) {
                      <tr [class.fav-row-sel]="selectedMobiles().has(row.mobileNumber)">
                        <td class="fav-cb-col"><input type="checkbox" [checked]="selectedMobiles().has(row.mobileNumber)" (change)="toggleSelect(row.mobileNumber)" aria-label="Select customer"></td>
                        <td><span class="cust-phone">{{ row.mobileNumber }}</span></td>
                        <td><span class="cust-name">{{ row.customerName }}</span></td>
                        <td>
                          @for (d of discountsFor(row.mobileNumber); track d.id) {
                            <span class="disc-badge" [class.disc-expired]="d.status === 'EXPIRED'" [class.disc-inactive]="d.status === 'INACTIVE'">
                              {{ d.name }} · {{ d.type === 'PERCENTAGE' ? d.value + '%' : '₹' + d.value }}
                            </span>
                          } @empty { <span class="disc-none">—</span> }
                        </td>
                        <td>
                          <div class="fav-items-list">
                            @for (item of row.items.slice(0,3); track item.name) {
                              <span class="fav-item-chip">{{ item.name }} <em>×{{ item.count }}</em></span>
                            }
                            @if (row.items.length > 3) {
                              <span class="chip-more">+{{ row.items.length - 3 }} more</span>
                            }
                          </div>
                        </td>
                        <td class="kd-num"><strong>{{ row.totalOrders }}</strong></td>
                        <td class="kd-num"><strong>₹{{ row.totalSpend | number:'1.0-0' }}</strong></td>
                        <td>
                          <div class="fav-actions">
                            <button class="btn-action btn-discount-ico" title="Assign discount" (click)="openAssignDiscount(row.mobileNumber)">🏷️</button>
                            <button class="btn-action btn-hist" (click)="viewCustomerProfile(row.mobileNumber)">👁 Profile</button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        <!-- ════════ ASSIGN DISCOUNT MODAL ════════ -->
        @if (showAssignModal()) {
          <div class="modal-overlay" (click)="closeAssignModal()">
            <div class="modal-box modal-sm" (click)="$event.stopPropagation()">
              <div class="modal-head">
                <div>
                  <div class="modal-title">🏷️ Assign Discount</div>
                  <div class="modal-sub">{{ assignTargets().length }} customer{{ assignTargets().length !== 1 ? 's' : '' }} selected</div>
                </div>
                <button class="modal-close" (click)="closeAssignModal()">✕</button>
              </div>
              <div class="modal-body">
                @if (assignableDiscounts().length === 0) {
                  <p class="assign-empty">No discounts yet. Create one in the <strong>Discounts</strong> tab first, then assign it here.</p>
                } @else {
                  <label class="assign-label">Choose a discount</label>
                  <select class="assign-sel" [(ngModel)]="assignDiscountId">
                    <option value="">Select…</option>
                    @for (d of assignableDiscounts(); track d._id) {
                      <option [value]="d._id">{{ d.name }} — {{ d.type === 'PERCENTAGE' ? d.value + '%' : '₹' + d.value }}{{ d.status === 'INACTIVE' ? ' (inactive)' : '' }}</option>
                    }
                  </select>
                  <div class="assign-targets">
                    @for (m of assignTargets(); track m) { <span class="assign-chip">{{ m }}</span> }
                  </div>
                }
              </div>
              <div class="modal-foot">
                <button class="btn btn-secondary" (click)="closeAssignModal()">Cancel</button>
                <button class="btn btn-primary" [disabled]="!assignDiscountId || assignSaving()" (click)="confirmAssignDiscount()">
                  {{ assignSaving() ? 'Assigning…' : 'Assign Discount' }}
                </button>
              </div>
            </div>
          </div>
        }

        <!-- ════════ ORDER HISTORY MODAL ════════ -->
        @if (historyOrder()) {
          <div class="modal-overlay" (click)="closeHistory()">
            <div class="modal-box" (click)="$event.stopPropagation()">
              <div class="modal-head">
                <div>
                  <div class="modal-title">📋 Order #{{ historyOrder()!.orderNumber }} — Full Timeline</div>
                  <div class="modal-sub">
                    Table {{ historyOrder()!.tableId?.number }} ·
                    {{ historyOrder()!.customerSessionId?.customerName || historyOrder()!.customerName || 'Customer' }} ·
                    {{ historyOrder()!.customerSessionId?.mobileNumber || historyOrder()!.customerPhone || '' }}
                  </div>
                </div>
                <button class="modal-close" (click)="closeHistory()">✕</button>
              </div>
              <div class="modal-body">
                <div class="timeline">
                  @for (item of historyOrder()!.items; track item._id) {
                    <div class="timeline-item" [class.timeline-cancelled]="item.status === 'CANCELLED'">
                      <div class="tl-time">{{ historyOrder()!.createdAt | date:'hh:mm a' }}</div>
                      <div class="tl-dot" [attr.data-s]="item.status.toLowerCase()"></div>
                      <div class="tl-content">
                        <div class="tl-name">{{ item.qty }}× {{ item.name }}</div>
                        @if (item.variant?.name) { <div class="tl-var">{{ item.variant.name }}</div> }
                        @if (item.notes) { <div class="tl-note">📝 {{ item.notes }}</div> }
                        <div class="tl-meta">
                          <span class="tl-status" [attr.data-s]="item.status.toLowerCase()">{{ item.status }}</span>
                          <span class="tl-price">₹{{ item.lineTotal }}</span>
                        </div>
                      </div>
                    </div>
                  }
                </div>
                <div class="modal-totals">
                  <div class="modal-total-row"><span>Subtotal</span><span>₹{{ historyOrder()!.subtotal | number:'1.2-2' }}</span></div>
                  @for (t of historyOrder()!.taxes; track t.name) {
                    <div class="modal-total-row"><span>{{ t.name }}</span><span>₹{{ t.amount | number:'1.2-2' }}</span></div>
                  }
                  <div class="modal-total-row modal-grand"><span>Total</span><span>₹{{ historyOrder()!.total | number:'1.2-2' }}</span></div>
                </div>
              </div>
              <div class="modal-foot">
                <button class="modal-btn-sec" (click)="closeHistory()">Close</button>
              </div>
            </div>
          </div>
        }

        <!-- ════════ PAYMENT MODAL ════════ -->
        @if (payOrder()) {
          <div class="modal-overlay" (click)="closePayModal()">
            <div class="modal-box modal-sm" (click)="$event.stopPropagation()">
              <div class="modal-head">
                <div class="modal-title">💰 Mark as Paid — Order #{{ payOrder()!.orderNumber }}</div>
                <button class="modal-close" (click)="closePayModal()">✕</button>
              </div>
              <div class="modal-body">
                <p class="modal-amount">Amount: <strong>₹{{ payOrder()!.total | number:'1.2-2' }}</strong></p>
                <div class="pay-modes">
                  <div class="pay-mode-label">Select Payment Mode:</div>
                  <div class="pay-mode-grid">
                    @for (mode of payModes; track mode.value) {
                      <button class="pay-mode-btn" [class.active]="selectedPayMode === mode.value"
                        (click)="selectedPayMode = mode.value">
                        {{ mode.icon }} {{ mode.label }}
                      </button>
                    }
                  </div>
                </div>
                @if (payError()) {
                  <div class="pay-err">{{ payError() }}</div>
                }
              </div>
              <div class="modal-foot">
                <button class="modal-btn-sec" (click)="closePayModal()">Cancel</button>
                <button class="modal-btn-primary" (click)="confirmPay()" [disabled]="payingOrder()">
                  @if (payingOrder()) { Processing… } @else { Confirm Payment }
                </button>
              </div>
            </div>
          </div>
        }

        <!-- ════════ CUSTOMER PROFILE MODAL ════════ -->
        @if (customerProfile()) {
          <div class="modal-overlay" (click)="closeCustomerProfile()">
            <div class="modal-box" (click)="$event.stopPropagation()">
              <div class="modal-head">
                <div>
                  <div class="modal-title">👤 {{ customerProfile()!.customerName }}</div>
                  <div class="modal-sub">📞 {{ customerProfile()!.mobileNumber }}</div>
                </div>
                <button class="modal-close" (click)="closeCustomerProfile()">✕</button>
              </div>
              <div class="modal-body">
                <div class="profile-stats">
                  <div class="profile-stat"><div class="ps-num">{{ customerProfile()!.totalVisits }}</div><div class="ps-lbl">Visits</div></div>
                  <div class="profile-stat"><div class="ps-num">{{ customerProfile()!.totalOrders }}</div><div class="ps-lbl">Orders</div></div>
                  <div class="profile-stat"><div class="ps-num">₹{{ customerProfile()!.totalSpend | number:'1.0-0' }}</div><div class="ps-lbl">Total Spend</div></div>
                  <div class="profile-stat"><div class="ps-num">₹{{ customerProfile()!.averageBill | number:'1.0-0' }}</div><div class="ps-lbl">Avg Bill</div></div>
                </div>
                @if (customerProfile()!.favoriteItem) {
                  <div class="profile-fav">⭐ Favorite: <strong>{{ customerProfile()!.favoriteItem.name }}</strong> (ordered {{ customerProfile()!.favoriteItem.count }} times)</div>
                }
                <div class="profile-items-head">Item Frequency</div>
                <div class="profile-items">
                  @for (item of customerProfile()!.itemFrequency.slice(0,10); track item.name) {
                    <div class="profile-item-row">
                      <span class="pi-name">{{ item.name }}</span>
                      <div class="pi-bar-wrap">
                        <div class="pi-bar" [style.width]="(item.count / customerProfile()!.itemFrequency[0].count * 100) + '%'"></div>
                      </div>
                      <span class="pi-count">×{{ item.count }}</span>
                    </div>
                  }
                </div>
              </div>
              <div class="modal-foot">
                <button class="modal-btn-sec" (click)="closeCustomerProfile()">Close</button>
              </div>
            </div>
          </div>
        }

        <!-- ════════ OUTLETS TAB ════════ -->
        @if (activeTab() === 'outlets') {
          <div style="padding:1.5rem;display:flex;flex-direction:column;gap:1.25rem;">
            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <h4 style="margin:0;font-size:1.1rem;font-weight:700;">Outlet Management</h4>
                <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">Manage your restaurant branches</p>
              </div>
              <button (click)="openOutletForm(null)" style="background:#4f46e5;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;font-weight:600;">+ Add Outlet</button>
            </div>

            <!-- Consolidated stats -->
            @if (consolidatedData()) {
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
                <div style="background:#f0f9ff;border-radius:10px;padding:16px;">
                  <div style="font-size:11px;color:#0284c7;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Total Revenue</div>
                  <div style="font-size:22px;font-weight:700;color:#0c4a6e;margin-top:4px;">₹{{ (consolidatedData()?.total?.revenue || 0) | number:'1.0-0' }}</div>
                </div>
                <div style="background:#f0fdf4;border-radius:10px;padding:16px;">
                  <div style="font-size:11px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Total Orders</div>
                  <div style="font-size:22px;font-weight:700;color:#14532d;margin-top:4px;">{{ consolidatedData()?.total?.orders || 0 }}</div>
                </div>
              </div>
            }

            <!-- Outlet cards -->
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">
              @for (o of outlets(); track o._id) {
                <div style="background:#fff;border-radius:12px;box-shadow:0 1px 6px rgba(0,0,0,.08);padding:20px;display:flex;flex-direction:column;gap:12px;">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                      @if (restaurantInfo()?.logoUrl) {
                        <img [src]="restaurantInfo()!.logoUrl" [alt]="restaurantInfo()!.name"
                          style="width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid #e5e7eb;flex-shrink:0;">
                      } @else {
                        <div style="width:40px;height:40px;border-radius:8px;background:linear-gradient(135deg,#4f46e5,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;flex-shrink:0;">
                          {{ restaurantInfo()?.name?.[0]?.toUpperCase() || o.name[0].toUpperCase() }}
                        </div>
                      }
                      <div style="min-width:0;">
                        <div style="font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ o.name }}</div>
                        <div style="font-size:12px;color:#6b7280;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ o.address }}</div>
                      </div>
                    </div>
                    <span [style.background]="o.status === 'ACTIVE' ? '#dcfce7' : '#f3f4f6'"
                          [style.color]="o.status === 'ACTIVE' ? '#16a34a' : '#9ca3af'"
                          style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;flex-shrink:0;">{{ o.status }}</span>
                  </div>
                  @if (o.phone) { <div style="font-size:12px;color:#6b7280;">📞 {{ o.phone }}</div> }
                  <!-- Table allocation bar -->
                  <div style="font-size:12px;color:#6b7280;">
                    🪑 Tables: {{ o.tableLimit > 0 ? o.tableLimit + ' allocated' : 'No limit set' }}
                  </div>
                  <div style="display:flex;gap:8px;margin-top:4px;">
                    <button (click)="openOutletForm(o)" style="flex:1;background:#f3f4f6;border:none;border-radius:6px;padding:7px;font-size:12px;cursor:pointer;">✏️ Edit</button>
                    <button (click)="toggleOutletStatus(o)" style="flex:1;background:#f3f4f6;border:none;border-radius:6px;padding:7px;font-size:12px;cursor:pointer;">
                      {{ o.status === 'ACTIVE' ? '⏸ Deactivate' : '▶ Activate' }}
                    </button>
                  </div>
                </div>
              }
              @if (outlets().length === 0) {
                <div style="grid-column:1/-1;text-align:center;padding:40px;color:#9ca3af;">
                  <div style="font-size:36px;margin-bottom:8px;">🏪</div>
                  <div style="font-weight:600;">No outlets yet</div>
                  <div style="font-size:13px;margin-top:4px;">Create your first outlet to get started</div>
                </div>
              }
            </div>

            <!-- Restaurant Logo -->
            <div style="background:#fff;border-radius:12px;box-shadow:0 1px 6px rgba(0,0,0,.08);padding:20px;margin-bottom:20px;">
              <div style="font-weight:700;font-size:15px;margin-bottom:4px;">Restaurant Logo</div>
              <div style="font-size:12px;color:#6b7280;margin-bottom:12px;">Shown on receipts and the customer-facing menu.</div>
              <app-image-upload folder="logo" [imageUrl]="logoUrl()" [imagePublicId]="logoPublicId()"
                (imageUrlChange)="logoUrl.set($event)" (imagePublicIdChange)="logoPublicId.set($event)">
              </app-image-upload>
              <div style="display:flex;justify-content:flex-end;margin-top:12px;">
                <button (click)="saveLogo()" [disabled]="savingLogo() || !logoUrl()" style="background:#059669;color:#fff;border:none;border-radius:8px;padding:9px 22px;font-size:13px;cursor:pointer;font-weight:600;">
                  {{ savingLogo() ? 'Saving...' : 'Save Logo' }}
                </button>
              </div>
            </div>

            <!-- Bill-level taxes -->
            <div style="background:#fff;border-radius:12px;box-shadow:0 1px 6px rgba(0,0,0,.08);padding:20px;">
              <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:16px;">
                <div style="min-width:0;flex:1;">
                  <div style="font-weight:700;font-size:15px;">Bill Taxes</div>
                  <div style="font-size:12px;color:#6b7280;margin-top:2px;">These taxes are applied once on the full bill total (not per item)</div>
                </div>
                <button (click)="addBillTax()" style="background:#4f46e5;color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:12px;cursor:pointer;font-weight:600;flex-shrink:0;">+ Add Tax</button>
              </div>

              @if (billTaxRows().length === 0) {
                <div style="text-align:center;padding:24px;color:#9ca3af;font-size:13px;">
                  No bill taxes configured. Add GST, Service Charge, etc. that apply to the entire bill.
                </div>
              }

              @for (tax of billTaxRows(); track $index) {
                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #f3f4f6;">
                  <!-- Row 1: Name + delete -->
                  <div style="display:flex;align-items:center;gap:8px;">
                    <input
                      [value]="tax.name"
                      (input)="updateBillTaxField($index, 'name', $any($event.target).value)"
                      placeholder="Tax name (e.g. GST, CGST)"
                      style="flex:1;min-width:0;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
                    <button (click)="removeBillTax($index)" [disabled]="deletingTaxId() === tax._id" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:18px;padding:0 4px;line-height:1;flex-shrink:0;">
                      {{ deletingTaxId() === tax._id ? '...' : '✕' }}
                    </button>x  
                  </div>
                  <!-- Row 2: Type + Rate + Active -->
                  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">
                    <select
                      [value]="tax.type"
                      (change)="updateBillTaxField($index, 'type', $any($event.target).value)"
                      style="flex:1;min-width:110px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;background:#fff;box-sizing:border-box;">
                      <option value="PERCENTAGE">% of Bill</option>
                      <option value="FLAT">&#8377; Flat</option>
                    </select>
                    <div style="position:relative;flex:1;min-width:110px;">
                      <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#6b7280;font-size:13px;pointer-events:none;">
                        {{ tax.type === 'FLAT' ? '₹' : '%' }}
                      </span>
                      <input
                        type="number"
                        min="0"
                        [value]="tax.rate"
                        (input)="updateBillTaxField($index, 'rate', +$any($event.target).value)"
                        style="width:100%;padding:8px 10px 8px 26px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;box-sizing:border-box;">
                    </div>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap;font-size:12px;color:#374151;flex-shrink:0;">
                      <input type="checkbox" [checked]="tax.enabled !== false" (change)="updateBillTaxField($index, 'enabled', $any($event.target).checked)" style="width:15px;height:15px;accent-color:#4f46e5;cursor:pointer;">
                      Active
                    </label>
                  </div>
                </div>
              }

              @if (billTaxRows().length > 0) {
                <div style="display:flex;justify-content:flex-end;margin-top:12px;">
                  <button (click)="saveBillTaxes()" [disabled]="savingBillTaxes()" style="background:#059669;color:#fff;border:none;border-radius:8px;padding:9px 22px;font-size:13px;cursor:pointer;font-weight:600;">
                    {{ savingBillTaxes() ? 'Saving...' : 'Save Bill Taxes' }}
                  </button>
                </div>
              }
            </div>
          </div>
        }

        <!-- Outlet create/edit modal -->
        @if (showOutletForm()) {
          <div (click)="showOutletForm.set(false)" style="position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:900;"></div>
          <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:16px;padding:28px;width:480px;max-width:95vw;max-height:90vh;overflow-y:auto;z-index:901;box-shadow:0 20px 60px rgba(0,0,0,.2);">
            <div style="font-weight:700;font-size:16px;margin-bottom:20px;">{{ editingOutlet() ? 'Edit Outlet' : 'Create Outlet' }}</div>
            <div style="display:flex;flex-direction:column;gap:14px;">
              <div>
                <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Outlet Name *</label>
                <input [(ngModel)]="outletForm.name" placeholder="e.g. Connaught Place Branch" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
              </div>
              <div>
                <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Address *</label>
                <input [(ngModel)]="outletForm.address" placeholder="Full address" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                  <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Phone</label>
                  <input [(ngModel)]="outletForm.phone" placeholder="+91 98765 43210" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
                </div>
                <div>
                  <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Email</label>
                  <input [(ngModel)]="outletForm.email" placeholder="outlet@email.com" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
                </div>
              </div>
              <!-- Table limit field -->
              <div>
                <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Table Limit for this Outlet</label>
                <input type="number" min="0" [(ngModel)]="outletForm.tableLimit"
                  placeholder="0"
                  [max]="availableForOutlet()"
                  style="width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
                @if (tableAvailability(); as avail) {
                  @if (availableForOutlet() > 0) {
                    <div style="margin-top:5px;font-size:11px;color:#059669;font-weight:600;">
                      ✓ {{ availableForOutlet() }} table slot(s) available for allocation
                      (Restaurant limit: {{ avail.restaurantLimit }}, Already allocated: {{ avail.totalAllocated - (editingOutlet()?.tableLimit || 0) }})
                    </div>
                  } @else {
                    <div style="margin-top:5px;font-size:11px;color:#dc2626;font-weight:600;">
                      ⚠ No table slots remaining. Contact platform admin to increase restaurant quota.
                    </div>
                  }
                } @else {
                  <div style="margin-top:5px;font-size:11px;color:#9ca3af;">Loading availability...</div>
                }
              </div>
              <!-- Staff accounts (create & edit) -->
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <label style="font-size:12px;font-weight:600;color:#374151;">
                    {{ editingOutlet() ? 'Staff Accounts' : 'Staff Accounts (optional)' }}
                  </label>
                  <button type="button" (click)="addStaffRow()" style="font-size:11px;color:#4f46e5;background:none;border:none;cursor:pointer;font-weight:600;">+ Add Staff</button>
                </div>
                @if (editingOutlet()) {
                  <div style="font-size:11px;color:#6b7280;margin-bottom:8px;">Leave password blank to keep existing password. Fill password to reset it.</div>
                }
                @for (s of outletStaffAccounts; track $index) {
                  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px;display:flex;flex-direction:column;gap:8px;position:relative;">
                    <button type="button" (click)="removeStaffRow($index)" style="position:absolute;top:8px;right:8px;background:none;border:none;color:#9ca3af;cursor:pointer;font-size:14px;">✕</button>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                      <div>
                        <label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:3px;">Full Name *</label>
                        <input [(ngModel)]="s.name" placeholder="e.g. Arjun Waiter" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;">
                      </div>
                      <div>
                        <label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:3px;">Role</label>
                        <select [(ngModel)]="s.role" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;background:#fff;">
                          <option value="WAITER">Waiter</option>
                          <option value="KITCHEN">Kitchen</option>
                          <option value="MANAGER">Manager</option>
                        </select>
                      </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                      <div>
                        <label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:3px;">Login Email *</label>
                        <input type="email" [(ngModel)]="s.email" placeholder="staff@outlet.com" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;">
                      </div>
                      <div>
                        <label style="font-size:11px;font-weight:600;color:#6b7280;display:block;margin-bottom:3px;">
                          {{ editingOutlet() ? 'New Password (optional)' : 'Password * (min 8 chars)' }}
                        </label>
                        <input type="password" [(ngModel)]="s.password" [placeholder]="editingOutlet() ? 'Leave blank to keep' : 'Secure password'" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;">
                      </div>
                    </div>
                  </div>
                }
                @if (outletStaffAccounts.length === 0) {
                  <div style="font-size:11px;color:#9ca3af;text-align:center;padding:8px;">
                    {{ editingOutlet() ? 'No staff assigned to this outlet.' : 'No staff accounts added. Can be added later.' }}
                  </div>
                }
              </div>
            </div>
            <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end;">
              <button (click)="showOutletForm.set(false)" style="background:#f3f4f6;border:none;border-radius:8px;padding:9px 20px;font-size:13px;cursor:pointer;">Cancel</button>
              <button (click)="saveOutlet()" [disabled]="!outletForm.name || !outletForm.address" style="background:#4f46e5;color:#fff;border:none;border-radius:8px;padding:9px 20px;font-size:13px;cursor:pointer;font-weight:600;">Save</button>
            </div>
          </div>
        }

        @if (receiptOrder()) {
          <div class="receipt-backdrop" (click)="closeReceipt()"></div>
          <div class="receipt-modal">
            <div class="receipt-modal-card">
              <div class="receipt-header">
                <div>
                  <h4>Receipt</h4>
                  <small class="text-muted">Order #{{ receiptOrder()?.order.orderNumber }}</small>
                </div>
                <button class="btn-close" (click)="closeReceipt()"></button>
              </div>
              <div class="receipt-body">
                @if (receiptError()) {
                  <div class="alert alert-danger">{{ receiptError() }}</div>
                }
                @if (receiptLoading()) {
                  <div class="text-center py-4">Loading receipt…</div>
                } @else {
                  <div class="rcpt">
                    @if (receiptOrder()?.restaurant?.logoUrl) {
                      <img class="rcpt-logo" [src]="receiptOrder()!.restaurant.logoUrl" [alt]="receiptOrder()!.restaurant.name">
                    }
                    <div class="rcpt-name">{{ receiptOrder()?.restaurant?.name }}</div>
                    @if (receiptOrder()?.restaurant?.address) {
                      <div class="rcpt-addr">{{ receiptOrder()!.restaurant.address }}</div>
                    }
                    @if (receiptOrder()?.restaurant?.phone) {
                      <div class="rcpt-addr">📞 {{ receiptOrder()!.restaurant.phone }}</div>
                    }
                    @if (receiptOrder()?.restaurant?.gstin) {
                      <div class="rcpt-addr">GSTIN: {{ receiptOrder()!.restaurant.gstin }}</div>
                    }
                    @if (receiptOrder()?.restaurant?.email) {
                      <div class="rcpt-addr">{{ receiptOrder()!.restaurant.email }}</div>
                    }
                    <div class="rcpt-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
                    <div class="rcpt-invoice-title">TAX INVOICE</div>
                    <div class="rcpt-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
                    <div class="rcpt-details">
                      <div class="rcpt-detail-row"><span>Order #</span><span>{{ receiptOrder()?.order.orderNumber }}</span></div>
                      <div class="rcpt-detail-row"><span>Table</span><span>{{ receiptOrder()?.table?.name || ('Table ' + receiptOrder()?.table?.number) }}</span></div>
                      @if (receiptOrder()?.order?.customerSessionId?.customerName) {
                        <div class="rcpt-detail-row"><span>Customer</span><span>{{ receiptOrder()!.order.customerSessionId.customerName }}</span></div>
                      }
                      @if (receiptOrder()?.order?.customerSessionId?.mobileNumber) {
                        <div class="rcpt-detail-row"><span>Mobile</span><span>{{ receiptOrder()!.order.customerSessionId.mobileNumber }}</span></div>
                      }
                      <div class="rcpt-detail-row"><span>Payment</span><span>{{ receiptOrder()?.order.paymentMode || receiptOrder()?.order.paymentStatus }}</span></div>
                      <div class="rcpt-detail-row"><span>Generated</span><span>{{ receiptOrder()?.generatedAt | date:'dd MMM yyyy, hh:mm a' }}</span></div>
                    </div>
                    <div class="rcpt-divider">───────────────────────────────────</div>
                    <table class="rcpt-table">
                      <thead>
                        <tr><th>Item</th><th class="rcpt-num">Qty</th><th class="rcpt-num">Rate</th><th class="rcpt-num">Amt</th></tr>
                      </thead>
                      <tbody>
                        @for (item of receiptOrder()?.order.items || []; track item._id) {
                          @if (item.status !== 'CANCELLED') {
                            <tr>
                              <td>
                                {{ item.name }}
                                @if (item.variant?.name) { <span class="rcpt-variant"> ({{ item.variant.name }})</span> }
                              </td>
                              <td class="rcpt-num">{{ item.qty }}</td>
                              <td class="rcpt-num">{{ item.unitPrice | number:'1.2-2' }}</td>
                              <td class="rcpt-num">{{ item.lineTotal | number:'1.2-2' }}</td>
                            </tr>
                          }
                        }
                      </tbody>
                    </table>
                    <div class="rcpt-divider">───────────────────────────────────</div>
                    <div class="rcpt-totals">
                      <div class="rcpt-total-row"><span>Subtotal</span><span>₹{{ receiptOrder()?.order.subtotal | number:'1.2-2' }}</span></div>
                      @for (t of receiptOrder()?.order.taxes || []; track t.name) {
                        @if ((t.amount || 0) > 0) {
                          <div class="rcpt-total-row rcpt-tax-row"><span>{{ t.name }}</span><span>₹{{ t.amount | number:'1.2-2' }}</span></div>
                        }
                      }
                      @if (receiptOrder()?.order.discount?.amount > 0) {
                        <div class="rcpt-total-row rcpt-discount-row">
                          <span>Discount ({{ receiptOrder()!.order.discount.name }} · {{ receiptOrder()!.order.discount.type === 'PERCENTAGE' ? receiptOrder()!.order.discount.value + '%' : '₹' + receiptOrder()!.order.discount.value }})</span>
                          <span>− ₹{{ receiptOrder()!.order.discount.amount | number:'1.2-2' }}</span>
                        </div>
                      }
                      <div class="rcpt-divider">───────────────────────────────────</div>
                      <div class="rcpt-total-row rcpt-grand-total"><span>GRAND TOTAL</span><span>₹{{ receiptOrder()?.order.total | number:'1.2-2' }}</span></div>
                    </div>
                    <div class="rcpt-divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
                    <div class="rcpt-footer">Thank You!</div>
                    @if (receiptOrder()?.restaurant?.website) {
                      <div class="rcpt-footer-web">{{ receiptOrder()!.restaurant.website }}</div>
                    }
                  </div>
                }
              </div>
              <div class="receipt-footer-btns">
                <button class="btn btn-secondary" (click)="closeReceipt()">Close</button>
                <button class="btn btn-primary" (click)="printReceipt()">🖨️ Print</button>
              </div>
            </div>
          </div>
        }

        <!-- ════════ DISCOUNTS TAB ════════ -->
        @if (activeTab() === 'discounts') {
          <div class="disc-view">
            <div class="disc-head">
              <div>
                <h2 class="an-title">Discounts</h2>
                <p class="an-sub">Create customer discounts and assign them by mobile number. Active discounts auto-apply to future orders.</p>
              </div>
              <button class="btn btn-primary" (click)="openDiscountForm()">+ New Discount</button>
            </div>

            @if (discountsLoading()) {
              <div class="an-loading"><div class="an-spinner"></div><span>Loading discounts…</span></div>
            } @else {
              @for (group of [
                { key: 'active',   label: 'Active',   rows: discounts().active },
                { key: 'inactive', label: 'Inactive', rows: discounts().inactive },
                { key: 'expired',  label: 'Expired',  rows: discounts().expired }
              ]; track group.key) {
                <div class="disc-group">
                  <div class="disc-group-title">
                    <span class="disc-dot" [class]="'disc-dot-' + group.key"></span>
                    {{ group.label }} <span class="disc-group-count">{{ group.rows.length }}</span>
                  </div>
                  @if (group.rows.length === 0) {
                    <div class="disc-group-empty">No {{ group.label.toLowerCase() }} discounts.</div>
                  } @else {
                    <div class="disc-cards">
                      @for (d of group.rows; track d._id) {
                        <div class="disc-card">
                          <div class="disc-card-top">
                            <div class="disc-card-name">{{ d.name }}</div>
                            <div class="disc-card-val">{{ d.type === 'PERCENTAGE' ? d.value + '%' : '₹' + d.value }} off</div>
                          </div>
                          <div class="disc-card-meta">
                            @if (d.startDate || d.expiryDate) {
                              <span>📅 {{ d.startDate ? (d.startDate | date:'dd MMM') : 'Now' }} → {{ d.expiryDate ? (d.expiryDate | date:'dd MMM yyyy') : 'No expiry' }}</span>
                            } @else { <span>📅 No date limit</span> }
                            <span>👥 {{ d.assignedCount }} customer{{ d.assignedCount !== 1 ? 's' : '' }}</span>
                          </div>
                          @if (d.assignedMobiles?.length) {
                            <div class="disc-assigned">
                              @for (m of d.assignedMobiles.slice(0, 6); track m) {
                                <span class="assign-chip">{{ m }} <button class="chip-x" title="Unassign" (click)="unassignMobile(d, m)">×</button></span>
                              }
                              @if (d.assignedMobiles.length > 6) { <span class="chip-more">+{{ d.assignedMobiles.length - 6 }}</span> }
                            </div>
                          }
                          <div class="disc-card-actions">
                            <button class="btn-action" (click)="openDiscountForm(d)">✏️ Edit</button>
                            <button class="btn-action" (click)="toggleDiscount(d)">{{ d.isActive ? '⏸ Deactivate' : '▶ Activate' }}</button>
                            <button class="btn-action btn-del" (click)="deleteDiscount(d)">🗑 Delete</button>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>

          <!-- Discount create/edit modal -->
          @if (showDiscountForm()) {
            <div class="modal-overlay" (click)="closeDiscountForm()">
              <div class="modal-box modal-sm" (click)="$event.stopPropagation()">
                <div class="modal-head">
                  <div class="modal-title">{{ editingDiscountId() ? 'Edit Discount' : 'New Discount' }}</div>
                  <button class="modal-close" (click)="closeDiscountForm()">✕</button>
                </div>
                <div class="modal-body disc-form">
                  <label class="assign-label">Discount Name</label>
                  <input class="assign-sel" [(ngModel)]="discountForm.name" placeholder="e.g. Loyal Customer 10%">

                  <div class="disc-form-row">
                    <div>
                      <label class="assign-label">Type</label>
                      <select class="assign-sel" [(ngModel)]="discountForm.type">
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FLAT">Flat (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label class="assign-label">{{ discountForm.type === 'PERCENTAGE' ? 'Percent' : 'Amount (₹)' }}</label>
                      <input class="assign-sel" type="number" min="0" [(ngModel)]="discountForm.value" placeholder="0">
                    </div>
                  </div>

                  <div class="disc-form-row">
                    <div>
                      <label class="assign-label">Start Date</label>
                      <input class="assign-sel" type="date" [(ngModel)]="discountForm.startDate">
                    </div>
                    <div>
                      <label class="assign-label">Expiry Date</label>
                      <input class="assign-sel" type="date" [(ngModel)]="discountForm.expiryDate">
                    </div>
                  </div>

                  @if (isOwner() && outlets().length > 1 && !editingDiscountId()) {
                    <label class="assign-label">Outlet</label>
                    <select class="assign-sel" [(ngModel)]="discountForm.outletId">
                      <option value="">Default outlet</option>
                      @for (o of outlets(); track o._id) { <option [value]="o._id">{{ o.name }}</option> }
                    </select>
                  }
                </div>
                <div class="modal-foot">
                  <button class="btn btn-secondary" (click)="closeDiscountForm()">Cancel</button>
                  <button class="btn btn-primary" [disabled]="discountSaving()" (click)="saveDiscount()">
                    {{ discountSaving() ? 'Saving…' : (editingDiscountId() ? 'Save Changes' : 'Create Discount') }}
                  </button>
                </div>
              </div>
            </div>
          }
        }

        <!-- ════════ ADVANCED ANALYTICS TAB ════════ -->
        @if (activeTab() === 'analytics') {
          <div class="an-view">
            <div class="an-head">
              <div>
                <h2 class="an-title">Business Analytics</h2>
                <p class="an-sub">Live performance across your {{ selectedOutletId() ? 'selected outlet' : 'restaurant' }}.</p>
              </div>
              <div class="an-range">
                @for (r of rangeOptions; track r.key) {
                  <button class="an-range-btn" [class.active]="anRange() === r.key" (click)="setRange(r.key)">{{ r.label }}</button>
                }
              </div>
            </div>

            @if (anRange() === 'custom') {
              <div class="an-custom">
                <label>From <input type="date" [(ngModel)]="anFrom" (change)="loadOverview()"></label>
                <label>To <input type="date" [(ngModel)]="anTo" (change)="loadOverview()"></label>
              </div>
            }

            @if (anLoading()) {
              <div class="an-loading"><div class="an-spinner"></div><span>Loading analytics…</span></div>
            } @else if (overview()) {
              @if (overview(); as ov) {
              <!-- KPI cards -->
              <div class="an-kpis">
                <div class="an-kpi">
                  <div class="an-kpi-lbl">Revenue</div>
                  <div class="an-kpi-num">₹{{ ov.summary.revenue | number:'1.0-0' }}</div>
                  <div class="an-kpi-meta">{{ ov.summary.paidOrders }} paid orders</div>
                </div>
                <div class="an-kpi">
                  <div class="an-kpi-lbl">Orders</div>
                  <div class="an-kpi-num">{{ ov.summary.orders | number }}</div>
                  <div class="an-kpi-meta">{{ ov.summary.completed }} completed</div>
                </div>
                <div class="an-kpi">
                  <div class="an-kpi-lbl">Avg Order Value</div>
                  <div class="an-kpi-num">₹{{ ov.summary.avgOrderValue | number:'1.0-0' }}</div>
                  <div class="an-kpi-meta">per paid order</div>
                </div>
                <div class="an-kpi">
                  <div class="an-kpi-lbl">Cancellations</div>
                  <div class="an-kpi-num">{{ ov.summary.cancelled | number }}</div>
                  <div class="an-kpi-meta">{{ ov.summary.cancellationRate | number:'1.0-1' }}% of orders</div>
                </div>
                @if (ov.kitchen) {
                  <div class="an-kpi">
                    <div class="an-kpi-lbl">Avg Prep Time</div>
                    <div class="an-kpi-num">{{ ov.kitchen.avgPrepMinutes }}<span class="an-kpi-unit">min</span></div>
                    <div class="an-kpi-meta">{{ ov.kitchen.ordersPrepared }} orders</div>
                  </div>
                }
              </div>

              <!-- Charts row -->
              <div class="an-grid">
                <div class="an-card an-card-wide">
                  <div class="an-card-title">Revenue & Orders Trend</div>
                  <canvas id="anRevenueChart"></canvas>
                </div>
                <div class="an-card">
                  <div class="an-card-title">Completed vs Cancelled</div>
                  <canvas id="anStatusChart"></canvas>
                </div>
                <div class="an-card">
                  <div class="an-card-title">Top Selling Products</div>
                  <canvas id="anTopChart"></canvas>
                </div>
                <div class="an-card">
                  <div class="an-card-title">Category Performance</div>
                  <canvas id="anCategoryChart"></canvas>
                </div>
                <div class="an-card an-card-wide">
                  <div class="an-card-title">Peak Business Hours</div>
                  <canvas id="anHoursChart"></canvas>
                </div>
                <div class="an-card">
                  <div class="an-card-title">Payment Mix</div>
                  <canvas id="anPaymentChart"></canvas>
                </div>
              </div>

              <!-- Tables row -->
              <div class="an-tables">
                <div class="an-card">
                  <div class="an-card-title">Top Tables</div>
                  <table class="an-table">
                    <thead><tr><th>Table</th><th class="an-r">Orders</th><th class="an-r">Revenue</th></tr></thead>
                    <tbody>
                      @for (t of ov.tablePerformance; track $index) {
                        <tr><td>{{ t.name }}</td><td class="an-r">{{ t.orders }}</td><td class="an-r">₹{{ t.revenue | number:'1.0-0' }}</td></tr>
                      } @empty { <tr><td colspan="3" class="an-empty-cell">No table data in this period.</td></tr> }
                    </tbody>
                  </table>
                </div>
                <div class="an-card">
                  <div class="an-card-title">Waiter Performance</div>
                  <table class="an-table">
                    <thead><tr><th>Waiter</th><th class="an-r">Served</th><th class="an-r">Revenue</th></tr></thead>
                    <tbody>
                      @for (w of ov.waiterPerformance; track $index) {
                        <tr><td>{{ w._id || '—' }}</td><td class="an-r">{{ w.served }}</td><td class="an-r">₹{{ w.revenue | number:'1.0-0' }}</td></tr>
                      } @empty { <tr><td colspan="3" class="an-empty-cell">No waiter activity in this period.</td></tr> }
                    </tbody>
                  </table>
                </div>
                <div class="an-card">
                  <div class="an-card-title">Low-Performing Products</div>
                  <table class="an-table">
                    <thead><tr><th>Item</th><th class="an-r">Qty</th><th class="an-r">Revenue</th></tr></thead>
                    <tbody>
                      @for (p of ov.lowProducts; track $index) {
                        <tr><td>{{ p.name }}</td><td class="an-r">{{ p.qty }}</td><td class="an-r">₹{{ p.revenue | number:'1.0-0' }}</td></tr>
                      } @empty { <tr><td colspan="3" class="an-empty-cell">No product sales in this period.</td></tr> }
                    </tbody>
                  </table>
                </div>
              </div>
              }
            } @else {
              <div class="an-empty">
                <div class="an-empty-icon">📊</div>
                <h3>No data for this period</h3>
                <p>Try a wider date range to see business performance.</p>
              </div>
            }
          </div>
        }

      </main>
    </div>
  `,
  styles: [`
    /* ── Design tokens ── */
    :host {
      --c-bg:       #f4f6fb;
      --c-surface:  #ffffff;
      --c-border:   #e8ecf4;
      --c-text:     #111827;
      --c-muted:    #6b7280;
      --c-primary:  #4f46e5;
      --c-danger:   #ef4444;
      --c-green:    #10b981;
      --r:          10px;
      --r-sm:       6px;
      --c-soft:     #f9fafb;
      --shadow:     0 1px 3px rgba(0,0,0,.07), 0 4px 12px rgba(0,0,0,.04);
      font-family: 'Inter', system-ui, sans-serif;
    }
    /* Dark theme — overrides shared tokens; the whole dashboard reacts instantly. */
    :host-context([data-theme="dark"]) {
      --c-bg:       #0f172a;
      --c-surface:  #1e293b;
      --c-border:   #334155;
      --c-text:     #f1f5f9;
      --c-muted:    #94a3b8;
      --c-primary:  #818cf8;
      --c-soft:     #243044;
      --shadow:     0 1px 3px rgba(0,0,0,.4), 0 4px 16px rgba(0,0,0,.3);
    }
    * { margin:0; padding:0; box-sizing:border-box; }

    /* ══ Waiter "Order Ready" popup ══ */
    .ready-overlay {
      position: fixed; inset: 0; z-index: 2000;
      background: rgba(8,12,24,.62); backdrop-filter: blur(3px);
      display: flex; align-items: center; justify-content: center; padding: 1rem;
      animation: readyFade .18s ease;
    }
    @keyframes readyFade { from { opacity: 0; } to { opacity: 1; } }
    .ready-modal {
      width: 100%; max-width: 440px; background: var(--c-surface);
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,.4); border: 1px solid var(--c-border);
      animation: readyPop .22s cubic-bezier(.16,1,.3,1);
    }
    @keyframes readyPop { from { transform: scale(.92) translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
    .ready-modal-head {
      display: flex; align-items: flex-start; gap: .75rem;
      padding: 1.1rem 1.25rem; background: linear-gradient(135deg, #10b981, #059669); color: #fff;
    }
    .ready-pulse {
      width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
      background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center;
      animation: readyPulse 1.4s ease-in-out infinite;
    }
    @keyframes readyPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,.4); } 50% { box-shadow: 0 0 0 8px rgba(255,255,255,0); } }
    .ready-head-text { flex: 1; }
    .ready-title { font-size: 1.05rem; font-weight: 800; }
    .ready-sub { font-size: .76rem; opacity: .9; margin-top: .15rem; }
    .ready-close {
      background: rgba(255,255,255,.15); border: none; color: #fff; cursor: pointer;
      width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; transition: background .15s;
    }
    .ready-close:hover { background: rgba(255,255,255,.3); }
    .ready-modal-body { padding: 1.1rem 1.25rem; max-height: 52vh; overflow-y: auto; }
    .ready-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin-bottom: 1rem; }
    .ready-meta { display: flex; flex-direction: column; gap: .15rem; }
    .ready-meta span { font-size: .68rem; text-transform: uppercase; letter-spacing: .04em; color: var(--c-muted); }
    .ready-meta strong { font-size: .95rem; color: var(--c-text); font-weight: 700; }
    .ready-items { display: flex; flex-direction: column; gap: .4rem; border-top: 1px solid var(--c-border); padding-top: .85rem; }
    .ready-item { display: flex; align-items: baseline; gap: .5rem; font-size: .85rem; color: var(--c-text); }
    .ready-item-qty { color: #059669; font-weight: 800; min-width: 1.8rem; }
    .ready-item-name { flex: 1; }
    .ready-item-var { color: var(--c-muted); font-size: .76rem; }
    .ready-item-note { display: block; color: #d97706; font-size: .74rem; margin-top: .1rem; }
    .ready-item-price { color: var(--c-muted); font-size: .8rem; }
    .ready-total {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 1rem; padding-top: .85rem; border-top: 1px solid var(--c-border);
    }
    .ready-total span { font-size: .82rem; color: var(--c-muted); font-weight: 600; }
    .ready-total strong { font-size: 1.2rem; font-weight: 800; color: var(--c-text); }
    .ready-queue-hint {
      margin-top: .85rem; text-align: center; font-size: .76rem; font-weight: 600;
      color: var(--c-primary); background: var(--c-soft); padding: .5rem; border-radius: 8px;
    }
    .ready-modal-foot { display: flex; gap: .65rem; padding: 1rem 1.25rem; border-top: 1px solid var(--c-border); }
    .ready-btn-cancel {
      flex: 1; padding: .8rem; border-radius: 10px; cursor: pointer; font-size: .88rem; font-weight: 700;
      background: transparent; border: 1.5px solid var(--c-border); color: var(--c-muted); transition: all .15s;
    }
    .ready-btn-cancel:hover { border-color: var(--c-danger); color: var(--c-danger); }
    .ready-btn-complete {
      flex: 2; padding: .8rem; border-radius: 10px; cursor: pointer; font-size: .9rem; font-weight: 800;
      background: linear-gradient(135deg, #10b981, #059669); border: none; color: #fff;
      display: flex; align-items: center; justify-content: center; gap: .4rem; transition: filter .15s;
    }
    .ready-btn-complete:hover { filter: brightness(1.08); }
    @media (max-width: 480px) {
      .ready-meta-grid { grid-template-columns: 1fr 1fr; }
      .ready-modal-foot { flex-direction: column-reverse; }
      .ready-btn-cancel, .ready-btn-complete { flex: none; width: 100%; }
    }

    /* ══ Layout ══ */
    .dashboard { min-height:100vh; background:var(--c-bg); }

    /* ══ Header ══ */
    .dash-header {
      background:var(--c-surface);
      border-bottom:1px solid var(--c-border);
      position:sticky; top:0; z-index:100;
      box-shadow:0 1px 0 var(--c-border);
    }
    .dash-header-inner {
      max-width:1440px; margin:0 auto;
      padding:.875rem 1.5rem;
      display:flex; align-items:center; justify-content:space-between; gap:1rem;
    }
    .brand { display:flex; align-items:center; gap:.75rem; }
    .brand-logo {
      width:42px; height:42px; border-radius:10px;
      object-fit:cover; border:1px solid var(--c-border); flex-shrink:0;
    }
    .brand-icon {
      width:40px; height:40px; background:var(--c-primary); color:#fff;
      border-radius:var(--r-sm); display:flex; align-items:center; justify-content:center;
      flex-shrink:0;
    }
    .brand-name { font-size:1.1rem; font-weight:700; color:var(--c-text); line-height:1.2; }
    .brand-sub  { font-size:.7rem; color:var(--c-muted); }

    .header-right { display:flex; align-items:center; gap:.75rem; }
    .user-chip {
      display:flex; align-items:center; gap:.625rem;
      padding:.4rem .875rem .4rem .5rem;
      background:var(--c-bg); border:1px solid var(--c-border);
      border-radius:3rem;
    }
    .user-ava {
      width:30px; height:30px; background:var(--c-primary); color:#fff;
      border-radius:50%; display:flex; align-items:center; justify-content:center;
      font-weight:700; font-size:.78rem; flex-shrink:0;
    }
    .user-name { display:block; font-size:.82rem; font-weight:600; color:var(--c-text); }
    .user-role {
      display:block; font-size:.65rem; font-weight:600;
      padding:.1rem .4rem; border-radius:.25rem; width:fit-content; margin-top:.05rem;
    }
    .user-role.manager { background:#dcfce7; color:#15803d; }
    .user-role.staff   { background:#dbeafe; color:#1d4ed8; }

    .btn-logout {
      display:flex; align-items:center; gap:.4rem;
      padding:.45rem .875rem;
      background:transparent; border:1px solid var(--c-border);
      border-radius:var(--r-sm); font-size:.8rem; color:var(--c-muted);
      cursor:pointer; transition:all .18s; white-space:nowrap;
    }
    .btn-logout:hover { background:var(--c-danger); border-color:var(--c-danger); color:#fff; }

    /* Header toggles (Working Mode + theme) */
    .hdr-toggle {
      display:flex; align-items:center; gap:.4rem;
      padding:.45rem .8rem; background:transparent;
      border:1px solid var(--c-border); border-radius:2rem;
      font-size:.78rem; font-weight:600; color:var(--c-muted);
      cursor:pointer; transition:all .18s; white-space:nowrap;
    }
    .hdr-toggle:hover { border-color:var(--c-primary); color:var(--c-primary); }
    .hdr-toggle-on {
      background:var(--c-primary); border-color:var(--c-primary); color:#fff;
    }
    .hdr-toggle-on:hover { color:#fff; filter:brightness(1.05); }
    .hdr-icon-btn {
      width:36px; height:36px; display:flex; align-items:center; justify-content:center;
      background:transparent; border:1px solid var(--c-border); border-radius:var(--r-sm);
      color:var(--c-muted); cursor:pointer; transition:all .18s; flex-shrink:0;
    }
    .hdr-icon-btn:hover { border-color:var(--c-primary); color:var(--c-primary); }
    .working-badge {
      display:inline-flex; align-items:center; gap:.45rem; margin-left:auto; align-self:center;
      padding:.4rem .85rem; border-radius:2rem; font-size:.76rem; font-weight:700;
      background:rgba(79,70,229,.1); color:var(--c-primary);
    }
    .working-dot { width:7px; height:7px; border-radius:50%; background:var(--c-primary); animation:blink 1.2s infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }

    /* ══ Nav ══ */
    .dash-nav {
      background:var(--c-surface);
      border-bottom:1px solid var(--c-border);
      position:sticky; top:61px; z-index:90;
    }
    .dash-nav-inner {
      max-width:1440px; margin:0 auto;
      padding:0 1.5rem;
      display:flex; gap:.25rem;
      overflow-x:auto; scrollbar-width:none;
    }
    .dash-nav-inner::-webkit-scrollbar { display:none; }
    .nav-tab {
      display:flex; align-items:center; gap:.45rem;
      padding:.75rem 1.125rem;
      background:transparent; border:none;
      font-size:.84rem; font-weight:500; color:var(--c-muted);
      cursor:pointer; transition:all .18s;
      position:relative; white-space:nowrap; flex-shrink:0;
    }
    .nav-tab:hover { color:var(--c-text); }
    .nav-tab.active { color:var(--c-primary); font-weight:600; }
    .nav-tab.active::after {
      content:''; position:absolute;
      bottom:-1px; left:0; right:0;
      height:2px; background:var(--c-primary);
      border-radius:2px 2px 0 0;
    }
    .nav-pill {
      background:var(--c-danger); color:#fff;
      font-size:.62rem; font-weight:700;
      padding:.1rem .4rem; border-radius:1rem;
    }

    /* ══ Main container ══ */
    .dash-main {
      max-width:1440px; margin:0 auto;
      padding:1.5rem;
    }

    /* ══ KPI Row ══ */
    .kpi-row {
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:1rem;
      margin-bottom:1.25rem;
    }
    .kpi-card {
      background:var(--c-surface);
      border:1px solid var(--c-border);
      border-radius:var(--r);
      padding:1.125rem 1.25rem;
      display:flex; align-items:center; gap:1rem;
      box-shadow:var(--shadow);
      transition:transform .18s, box-shadow .18s;
    }
    .kpi-card:hover { transform:translateY(-2px); box-shadow:0 4px 20px rgba(0,0,0,.09); }
    .kpi-icon-wrap {
      width:44px; height:44px; border-radius:var(--r-sm);
      background:var(--accent-bg); color:var(--accent);
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0;
    }
    .kpi-num  { font-size:1.6rem; font-weight:800; color:var(--c-text); line-height:1.15; }
    .kpi-lbl  { font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:var(--c-muted); margin-top:.2rem; }
    .kpi-meta { font-size:.7rem; color:var(--c-muted); margin-top:.1rem; }

    /* ══ Period Bar ══ */
    .period-bar {
      display:inline-flex; gap:.25rem;
      background:var(--c-surface); border:1px solid var(--c-border);
      border-radius:var(--r-sm); padding:.25rem;
      margin-bottom:1.25rem; box-shadow:var(--shadow);
    }
    .period-btn {
      padding:.4rem 1rem; background:transparent; border:none;
      border-radius:calc(var(--r-sm) - 2px);
      font-size:.82rem; font-weight:500; color:var(--c-muted);
      cursor:pointer; transition:all .18s;
    }
    .period-btn:hover { color:var(--c-text); }
    .period-btn.active {
      background:var(--c-primary); color:#fff;
      box-shadow:0 1px 6px rgba(79,70,229,.35);
    }

    /* ══ Charts Grid ══ */
    .charts-grid {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:1rem;
      margin-bottom:1.5rem;
    }
    .chart-box {
      background:var(--c-surface);
      border:1px solid var(--c-border);
      border-radius:var(--r);
      box-shadow:var(--shadow);
      overflow:hidden;
      display:flex; flex-direction:column;
    }
    .span-2 { grid-column:1 / -1; }

    .chart-box-head {
      display:flex; align-items:flex-start; justify-content:space-between;
      padding:1rem 1.25rem .875rem;
      border-bottom:1px solid var(--c-border);
    }
    .chart-box-title { font-size:.9rem; font-weight:700; color:var(--c-text); }
    .chart-box-sub   { font-size:.72rem; color:var(--c-muted); margin-top:.15rem; }
    .chart-tag {
      font-size:.65rem; font-weight:600;
      background:var(--c-bg); color:var(--c-muted);
      border:1px solid var(--c-border);
      padding:.2rem .55rem; border-radius:1rem;
      white-space:nowrap; flex-shrink:0;
    }
    .chart-box-body {
      flex:1; padding:1rem 1.25rem;
      display:flex; align-items:center; justify-content:center;
      min-height:220px;
    }
    .chart-box-body canvas { width:100% !important; display:block; }
    .chart-placeholder {
      display:flex; flex-direction:column; align-items:center;
      gap:.625rem; color:var(--c-muted); text-align:center;
    }
    .chart-placeholder span { font-size:.82rem; }

    /* ══ Orders Card ══ */
    .orders-card {
      background:var(--c-surface);
      border:1px solid var(--c-border);
      border-radius:var(--r);
      box-shadow:var(--shadow);
      overflow:hidden;
    }
    .orders-card-head {
      display:flex; align-items:flex-start; justify-content:space-between;
      padding:1.125rem 1.25rem;
      border-bottom:1px solid var(--c-border);
      flex-wrap:wrap; gap:.75rem;
    }
    .orders-title { font-size:.95rem; font-weight:700; color:var(--c-text); }
    .orders-sub   { font-size:.72rem; color:var(--c-muted); margin-top:.15rem; }
    .btn-refresh {
      display:flex; align-items:center; gap:.4rem;
      padding:.4rem .875rem; background:transparent;
      border:1px solid var(--c-border); border-radius:var(--r-sm);
      font-size:.78rem; color:var(--c-muted); cursor:pointer; transition:all .18s;
    }
    .btn-refresh:hover { background:var(--c-bg); color:var(--c-text); }

    .err-banner {
      display:flex; align-items:center; gap:.5rem;
      margin:1rem 1.25rem; padding:.7rem 1rem;
      background:#fef2f2; border:1px solid #fecaca;
      border-radius:var(--r-sm); font-size:.82rem; color:var(--c-danger);
    }
    .err-banner button {
      margin-left:auto; background:none; border:none;
      font-size:1.1rem; cursor:pointer; color:inherit;
    }

    .empty-orders {
      text-align:center; padding:3.5rem 2rem; color:var(--c-muted);
    }
    .empty-orders svg { margin-bottom:.875rem; }
    .empty-title { font-size:.95rem; font-weight:600; color:var(--c-text); margin-bottom:.35rem; }
    .empty-desc  { font-size:.8rem; }

    /* ── Table ── */
    .table-scroll { overflow-x:auto; }
    .orders-tbl { width:100%; border-collapse:collapse; font-size:.83rem; }
    .orders-tbl thead { background:var(--c-bg); }
    .orders-tbl th {
      text-align:left; padding:.75rem 1rem;
      font-size:.7rem; font-weight:700;
      text-transform:uppercase; letter-spacing:.05em;
      color:var(--c-muted); white-space:nowrap;
      border-bottom:1px solid var(--c-border);
    }
    .orders-tbl td {
      padding:.875rem 1rem;
      border-bottom:1px solid var(--c-border);
      vertical-align:middle;
    }
    .orders-tbl tbody tr:last-child td { border-bottom:none; }
    .orders-tbl tbody tr:hover { background:#fafbff; }

    .order-num { font-weight:700; font-family:'Courier New',monospace; color:var(--c-text); font-size:.85rem; }
    .table-num {
      display:inline-block; background:#ede9fe; color:#5b21b6;
      font-weight:700; font-size:.75rem;
      padding:.2rem .5rem; border-radius:.25rem;
    }
    .items-chips { display:flex; flex-wrap:wrap; gap:.3rem; max-width:220px; }
    .chip {
      background:var(--c-bg); color:var(--c-text);
      border:1px solid var(--c-border);
      padding:.18rem .45rem; border-radius:.25rem;
      font-size:.72rem; white-space:nowrap;
    }
    .chip-more { font-size:.7rem; color:var(--c-muted); padding:.18rem .3rem; }
    .total-amt { font-weight:700; color:var(--c-text); }

    .status-pill {
      display:inline-flex; align-items:center; gap:.3rem;
      padding:.25rem .6rem; border-radius:.3rem;
      font-size:.72rem; font-weight:600; white-space:nowrap;
    }
    .status-pill[data-s="pending"]   { background:#fef3c7; color:#92400e; }
    .status-pill[data-s="preparing"] { background:#dbeafe; color:#1e40af; }
    .status-pill[data-s="ready"]     { background:#d1fae5; color:#065f46; }
    .status-pill[data-s="served"]    { background:#f3e8ff; color:#6b21a8; }
    .status-pill[data-s="completed"] { background:#e0e7ff; color:#3730a3; }
    .status-pill[data-s="cancelled"] { background:#fee2e2; color:#991b1b; }

    .pay-pill {
      display:inline-flex; align-items:center; gap:.25rem;
      padding:.25rem .6rem; border-radius:.3rem;
      font-size:.72rem; font-weight:600; white-space:nowrap;
    }
    .pay-pill.paid   { background:#d1fae5; color:#065f46; }
    .pay-pill.unpaid { background:#fee2e2; color:#991b1b; }

    .time-ago { font-size:.75rem; color:var(--c-muted); white-space:nowrap; }

    .btn-pay {
      display:inline-flex; align-items:center; gap:.3rem;
      padding:.35rem .75rem;
      background:var(--c-primary); color:#fff; border:none;
      border-radius:var(--r-sm); font-size:.75rem; font-weight:600;
      cursor:pointer; transition:all .18s; white-space:nowrap;
    }
    .btn-pay:hover { background:#4338ca; transform:translateY(-1px); }
    .btn-pay.btn-receipt { background:#0f766e; }
    .btn-pay.btn-receipt:hover { background:#134e4a; }

    .receipt-backdrop {
      position:fixed; inset:0; background:rgba(15,23,42,.5); z-index:1200;
    }
    .receipt-modal {
      position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
      z-index:1210; padding:1rem; overflow:auto;
    }
    .receipt-modal-card {
      width:min(500px,100%); background:#fff; border-radius:18px;
      box-shadow:0 24px 80px rgba(15,23,42,.18); overflow:hidden;
      border:1px solid rgba(15,23,42,.08); display:flex; flex-direction:column; max-height:90vh;
    }
    .receipt-header {
      display:flex; align-items:center; justify-content:space-between;
      gap:1rem; padding:1.1rem 1.25rem; border-bottom:1px solid #e5e7eb; flex-shrink:0;
    }
    .receipt-header h4 { margin:0; font-size:1.05rem; }
    .receipt-body { padding:1.25rem; overflow-y:auto; flex:1; }
    .receipt-footer-btns {
      padding:1rem 1.25rem; display:flex; justify-content:flex-end; gap:.75rem;
      border-top:1px solid #e5e7eb; flex-shrink:0;
    }

    /* Thermal receipt styles */
    .rcpt { font-family:'Courier New',monospace; font-size:12px; color:#111; text-align:center; max-width:320px; margin:0 auto; }
    .rcpt-logo { width:64px; height:64px; object-fit:contain; margin-bottom:.5rem; border-radius:8px; }
    .rcpt-name { font-size:15px; font-weight:bold; text-transform:uppercase; letter-spacing:.05em; margin-bottom:.2rem; }
    .rcpt-addr { font-size:11px; color:#444; margin:.1rem 0; }
    .rcpt-divider { color:#666; margin:.5rem 0; font-size:10px; overflow:hidden; }
    .rcpt-invoice-title { font-size:12px; font-weight:bold; text-transform:uppercase; letter-spacing:.06em; margin:.2rem 0; }
    .rcpt-details { text-align:left; margin:.5rem 0; }
    .rcpt-detail-row { display:flex; justify-content:space-between; font-size:11px; padding:.15rem 0; }
    .rcpt-detail-row span:first-child { color:#666; }
    .rcpt-detail-row span:last-child { font-weight:600; text-align:right; flex:1; margin-left:.5rem; }
    .rcpt-table { width:100%; border-collapse:collapse; font-size:11px; margin:.5rem 0; }
    .rcpt-table th { border-bottom:1px dashed #999; padding:.25rem .1rem; font-weight:bold; text-align:left; }
    .rcpt-table td { padding:.2rem .1rem; vertical-align:top; }
    .rcpt-num { text-align:right; }
    .rcpt-variant { color:#666; font-size:10px; }
    .rcpt-totals { text-align:left; }
    .rcpt-total-row { display:flex; justify-content:space-between; font-size:11px; padding:.2rem 0; }
    .rcpt-tax-row { color:#555; }
    .rcpt-grand-total { font-size:14px; font-weight:bold; padding:.5rem 0; }
    .rcpt-discount-row { color:#059669; font-weight:600; }
    .rcpt-footer { font-size:12px; font-weight:bold; margin:.3rem 0; text-transform:uppercase; }
    .rcpt-footer-web { font-size:10px; color:#777; margin-top:.15rem; }

    @media print {
      .receipt-backdrop, .btn-pay, .nav-tab, .dash-header, .dash-nav, .orders-tbl, .menu-layout, .side-card, .receipt-footer-btns { display:none !important; }
      .receipt-modal { position:static; overflow:visible; }
      .receipt-modal-card { box-shadow:none; border:none; width:auto; max-height:none; }
      .receipt-body { overflow:visible; }
    }

    /* ── Customer columns ── */
    .col-cust { min-width:140px; }
    .cust-cell { display:flex; flex-direction:column; gap:.15rem; }
    .cust-name { font-size:.82rem; font-weight:600; color:var(--c-text); }
    .cust-phone { font-size:.72rem; color:var(--c-muted); }
    .pay-cell { display:flex; flex-direction:column; gap:.2rem; }
    .pay-mode { font-size:.68rem; background:#f0fdf4; color:#15803d; padding:.1rem .35rem; border-radius:.2rem; font-weight:600; width:fit-content; }
    .text-muted { color:var(--c-muted); font-size:.82rem; }
    .action-btns { display:flex; gap:.35rem; flex-wrap:wrap; }
    .btn-action { padding:.3rem .5rem; font-size:.82rem; cursor:pointer; border-radius:var(--r-sm); border:1px solid var(--c-border); background:var(--c-bg); transition:all .18s; }
    .btn-hist { color:var(--c-muted); }
    .btn-hist:hover { background:var(--c-primary); color:white; border-color:var(--c-primary); }

    /* ── Modals ── */
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:300; display:flex; align-items:center; justify-content:center; padding:1rem; }
    .modal-box { background:white; border-radius:var(--r); width:100%; max-width:560px; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.2); }
    .modal-sm { max-width:400px; }
    .modal-head { display:flex; align-items:flex-start; justify-content:space-between; padding:1rem 1.25rem; border-bottom:1px solid var(--c-border); }
    .modal-title { font-size:.95rem; font-weight:700; color:var(--c-text); }
    .modal-sub { font-size:.75rem; color:var(--c-muted); margin-top:.2rem; }
    .modal-close { background:none; border:none; font-size:1rem; color:var(--c-muted); cursor:pointer; padding:.25rem; }
    .modal-body { flex:1; overflow-y:auto; padding:1.25rem; }
    .modal-foot { display:flex; justify-content:flex-end; gap:.75rem; padding:1rem 1.25rem; border-top:1px solid var(--c-border); }
    .modal-btn-sec { padding:.6rem 1.25rem; background:var(--c-bg); border:1px solid var(--c-border); border-radius:var(--r-sm); font-size:.85rem; cursor:pointer; }
    .modal-btn-primary { padding:.6rem 1.25rem; background:var(--c-primary); color:white; border:none; border-radius:var(--r-sm); font-size:.85rem; font-weight:700; cursor:pointer; }
    .modal-btn-primary:disabled { opacity:.6; cursor:not-allowed; }

    /* Timeline */
    .timeline { display:flex; flex-direction:column; gap:.75rem; }
    .timeline-item { display:grid; grid-template-columns:60px 12px 1fr; gap:.5rem; align-items:flex-start; }
    .tl-time { font-size:.72rem; color:var(--c-muted); padding-top:.2rem; text-align:right; }
    .tl-dot { width:12px; height:12px; border-radius:50%; background:var(--c-primary); margin-top:.3rem; flex-shrink:0; }
    .timeline-cancelled .tl-dot { background:#d1d5db; }
    .tl-name { font-size:.85rem; font-weight:600; color:var(--c-text); }
    .tl-var { font-size:.72rem; color:var(--c-muted); }
    .tl-note { font-size:.72rem; color:#d97706; }
    .tl-meta { display:flex; align-items:center; gap:.5rem; margin-top:.25rem; }
    .tl-status { font-size:.65rem; font-weight:700; padding:.15rem .4rem; border-radius:.2rem; }
    .tl-status[data-s="served"]    { background:#f3e8ff; color:#6b21a8; }
    .tl-status[data-s="completed"] { background:#d1fae5; color:#065f46; }
    .tl-status[data-s="pending"]   { background:#fef3c7; color:#92400e; }
    .tl-status[data-s="cancelled"] { background:#fee2e2; color:#991b1b; }
    .tl-price { font-size:.78rem; font-weight:600; color:var(--c-text); margin-left:auto; }
    .modal-totals { border-top:1px solid var(--c-border); margin-top:1rem; padding-top:1rem; }
    .modal-total-row { display:flex; justify-content:space-between; font-size:.85rem; padding:.25rem 0; color:var(--c-text); }
    .modal-grand { font-weight:800; font-size:1rem; border-top:1px solid var(--c-border); padding-top:.5rem; margin-top:.35rem; }

    /* Payment Modal */
    .modal-amount { font-size:.95rem; margin-bottom:1.25rem; }
    .pay-modes { }
    .pay-mode-label { font-size:.8rem; font-weight:600; color:var(--c-text); margin-bottom:.75rem; }
    .pay-mode-grid { display:grid; grid-template-columns:1fr 1fr; gap:.625rem; }
    .pay-mode-btn { padding:.75rem; border:2px solid var(--c-border); border-radius:var(--r-sm); background:var(--c-bg); cursor:pointer; font-size:.85rem; font-weight:600; transition:all .18s; }
    .pay-mode-btn.active { border-color:var(--c-primary); background:#eef2ff; color:var(--c-primary); }
    .pay-err { background:#fee2e2; color:#991b1b; padding:.625rem .875rem; border-radius:var(--r-sm); font-size:.82rem; margin-top:.75rem; }

    /* Favorites */
    .fav-view { display:flex; flex-direction:column; gap:1.25rem; }
    .fav-head { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:1rem; }
    .fav-title { font-size:1.25rem; font-weight:700; color:var(--c-text); }
    .fav-sub { font-size:.82rem; color:var(--c-muted); margin-top:.25rem; }
    .fav-controls { display:flex; gap:.625rem; flex-wrap:wrap; align-items:center; }
    .fav-period-sel { padding:.45rem .75rem; border:1px solid var(--c-border); border-radius:var(--r-sm); font-size:.82rem; background:white; }
    .fav-search { padding:.45rem .75rem; border:1px solid var(--c-border); border-radius:var(--r-sm); font-size:.82rem; width:160px; }
    .btn-export { padding:.45rem .875rem; background:var(--c-green); color:white; border:none; border-radius:var(--r-sm); font-size:.82rem; font-weight:700; cursor:pointer; white-space:nowrap; }
    .fav-loading { padding:2rem; text-align:center; color:var(--c-muted); }
    .fav-empty   { padding:2rem; text-align:center; color:var(--c-muted); font-size:.875rem; }
    .fav-tbl { }
    .fav-items-list { display:flex; flex-wrap:wrap; gap:.3rem; }
    .fav-item-chip { font-size:.72rem; background:#eef2ff; color:var(--c-primary); padding:.15rem .5rem; border-radius:2rem; }
    .fav-item-chip em { font-style:normal; font-weight:700; }
    .kd-num { text-align:right; }

    /* Customer Profile */
    .profile-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.25rem; }
    .profile-stat { text-align:center; background:var(--c-bg); border-radius:var(--r-sm); padding:.875rem .5rem; }
    .ps-num { font-size:1.25rem; font-weight:800; color:var(--c-primary); }
    .ps-lbl { font-size:.72rem; color:var(--c-muted); margin-top:.2rem; }
    .profile-fav { background:#fef3c7; border-radius:var(--r-sm); padding:.625rem 1rem; font-size:.85rem; margin-bottom:1rem; }
    .profile-items-head { font-size:.8rem; font-weight:700; color:var(--c-text); text-transform:uppercase; letter-spacing:.04em; margin-bottom:.75rem; }
    .profile-items { display:flex; flex-direction:column; gap:.5rem; }
    .profile-item-row { display:flex; align-items:center; gap:.75rem; }
    .pi-name { font-size:.82rem; width:160px; flex-shrink:0; }
    .pi-bar-wrap { flex:1; height:8px; background:var(--c-bg); border-radius:4px; overflow:hidden; }
    .pi-bar { height:100%; background:var(--c-primary); border-radius:4px; transition:width .3s; }
    .pi-count { font-size:.75rem; font-weight:700; color:var(--c-primary); min-width:40px; text-align:right; }

    /* Hide cols on smaller screens */
    .col-items, .col-time, .col-pay { }

    /* ══ Menu Layout ══ */
    .menu-layout {
      display:grid; grid-template-columns:2fr 1fr; gap:1.25rem;
    }
    .menu-main-col {
      background:var(--c-surface); border:1px solid var(--c-border);
      border-radius:var(--r); overflow:hidden; box-shadow:var(--shadow);
      min-width:0;
    }
    .menu-side-col { min-width:0; }
    .side-card {
      background:var(--c-surface); border:1px solid var(--c-border);
      border-radius:var(--r); overflow:hidden; box-shadow:var(--shadow);
    }
    .side-card-head {
      display:flex; align-items:center; gap:.75rem;
      padding:1rem 1.25rem; border-bottom:1px solid var(--c-border);
    }
    .side-icon {
      width:36px; height:36px; border-radius:var(--r-sm);
      background:linear-gradient(135deg,#667eea,#764ba2);
      color:#fff; display:flex; align-items:center; justify-content:center;
      flex-shrink:0;
    }
    .side-title { font-size:.88rem; font-weight:700; color:var(--c-text); }
    .side-sub   { font-size:.7rem; color:var(--c-muted); margin-top:.1rem; }

    /* ══ Advanced Analytics tab ══ */
    .an-view { max-width:1440px; margin:0 auto; }
    .an-head { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom:1.25rem; }
    .an-title { font-size:1.35rem; font-weight:800; color:var(--c-text); }
    .an-sub { font-size:.82rem; color:var(--c-muted); margin-top:.2rem; }
    .an-range { display:flex; gap:.35rem; flex-wrap:wrap; }
    .an-range-btn {
      padding:.45rem .8rem; border-radius:2rem; border:1px solid var(--c-border);
      background:var(--c-surface); color:var(--c-muted); font-size:.76rem; font-weight:600; cursor:pointer; transition:all .15s;
    }
    .an-range-btn:hover { border-color:var(--c-primary); color:var(--c-primary); }
    .an-range-btn.active { background:var(--c-primary); border-color:var(--c-primary); color:#fff; }
    .an-custom { display:flex; gap:1rem; margin-bottom:1.25rem; flex-wrap:wrap; }
    .an-custom label { font-size:.78rem; color:var(--c-muted); display:flex; flex-direction:column; gap:.3rem; font-weight:600; }
    .an-custom input { padding:.45rem .6rem; border:1px solid var(--c-border); border-radius:var(--r-sm); background:var(--c-surface); color:var(--c-text); font-size:.82rem; }

    .an-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:1rem; margin-bottom:1.25rem; }
    .an-kpi {
      background:var(--c-surface); border:1px solid var(--c-border); border-radius:var(--r);
      padding:1.1rem 1.25rem; box-shadow:var(--shadow);
    }
    .an-kpi-lbl { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--c-muted); }
    .an-kpi-num { font-size:1.7rem; font-weight:800; color:var(--c-text); margin-top:.35rem; line-height:1.1; }
    .an-kpi-unit { font-size:.9rem; font-weight:600; color:var(--c-muted); margin-left:.2rem; }
    .an-kpi-meta { font-size:.72rem; color:var(--c-muted); margin-top:.25rem; }

    .an-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; margin-bottom:1rem; }
    .an-tables { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; }
    .an-card {
      background:var(--c-surface); border:1px solid var(--c-border); border-radius:var(--r);
      padding:1.1rem 1.25rem; box-shadow:var(--shadow); min-width:0;
    }
    .an-card-wide { grid-column:span 2; }
    .an-card-title { font-size:.82rem; font-weight:700; color:var(--c-text); margin-bottom:1rem; }
    .an-card canvas { max-height:260px; }

    .an-table { width:100%; border-collapse:collapse; font-size:.8rem; }
    .an-table th {
      text-align:left; padding:.4rem .5rem; color:var(--c-muted); font-size:.68rem;
      text-transform:uppercase; letter-spacing:.04em; border-bottom:1px solid var(--c-border);
    }
    .an-table td { padding:.55rem .5rem; color:var(--c-text); border-bottom:1px solid var(--c-border); }
    .an-table tr:last-child td { border-bottom:none; }
    .an-r { text-align:right; }
    .an-empty-cell { text-align:center; color:var(--c-muted); padding:1.25rem 0; }

    .an-loading { display:flex; flex-direction:column; align-items:center; gap:1rem; padding:4rem 0; color:var(--c-muted); font-size:.85rem; }
    .an-spinner {
      width:36px; height:36px; border:3px solid var(--c-border); border-top-color:var(--c-primary);
      border-radius:50%; animation:anSpin .7s linear infinite;
    }
    @keyframes anSpin { to { transform:rotate(360deg); } }
    .an-empty { text-align:center; padding:4rem 1rem; color:var(--c-muted); }
    .an-empty-icon { font-size:2.5rem; margin-bottom:.75rem; }
    .an-empty h3 { color:var(--c-text); font-size:1.05rem; margin-bottom:.35rem; }

    @media (max-width:960px) {
      .an-grid { grid-template-columns:1fr; }
      .an-card-wide { grid-column:span 1; }
      .an-tables { grid-template-columns:1fr; }
    }

    /* ══ Discounts + customer assignment ══ */
    .fav-cb-col { width:36px; text-align:center; }
    .fav-cb-col input { width:16px; height:16px; cursor:pointer; accent-color:var(--c-primary); }
    .fav-row-sel { background:rgba(79,70,229,.06); }
    .fav-actions { display:flex; gap:.35rem; align-items:center; }
    .btn-discount-ico { font-size:.95rem; padding:.25rem .45rem; }
    .fav-bulkbar {
      display:flex; align-items:center; gap:.75rem; margin-bottom:.9rem;
      background:var(--c-surface); border:1px solid var(--c-primary); border-radius:var(--r);
      padding:.6rem 1rem; box-shadow:var(--shadow);
    }
    .fav-bulk-count { font-weight:700; color:var(--c-primary); font-size:.85rem; }
    .btn-discount {
      background:var(--c-primary); color:#fff; border:none; border-radius:var(--r-sm);
      padding:.45rem .9rem; font-size:.8rem; font-weight:600; cursor:pointer;
    }
    .fav-bulk-clear { background:transparent; border:none; color:var(--c-muted); cursor:pointer; font-size:.8rem; }
    .disc-badge {
      display:inline-block; font-size:.7rem; font-weight:600; padding:.15rem .5rem; border-radius:1rem;
      background:rgba(16,185,129,.12); color:#059669; margin:.1rem .15rem .1rem 0;
    }
    .disc-badge.disc-expired { background:rgba(239,68,68,.12); color:#dc2626; text-decoration:line-through; }
    .disc-badge.disc-inactive { background:rgba(148,163,184,.18); color:var(--c-muted); }
    .disc-none { color:var(--c-muted); }

    .modal-sm { max-width:460px; }
    .assign-empty { color:var(--c-muted); font-size:.85rem; }
    .assign-label { display:block; font-size:.72rem; font-weight:700; color:var(--c-muted); text-transform:uppercase; letter-spacing:.04em; margin:.6rem 0 .3rem; }
    .assign-sel {
      width:100%; box-sizing:border-box; padding:.55rem .7rem; border:1px solid var(--c-border);
      border-radius:var(--r-sm); background:var(--c-surface); color:var(--c-text); font-size:.85rem;
    }
    .assign-targets, .disc-assigned { display:flex; flex-wrap:wrap; gap:.35rem; margin-top:.75rem; }
    .assign-chip {
      display:inline-flex; align-items:center; gap:.25rem; font-size:.74rem; font-weight:600;
      background:var(--c-soft); color:var(--c-text); padding:.2rem .5rem; border-radius:1rem;
    }
    .chip-x { background:none; border:none; cursor:pointer; color:var(--c-muted); font-size:.9rem; line-height:1; padding:0; }
    .chip-x:hover { color:var(--c-danger); }

    .disc-view { max-width:1440px; margin:0 auto; }
    .disc-head { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom:1.5rem; }
    .disc-group { margin-bottom:1.75rem; }
    .disc-group-title { display:flex; align-items:center; gap:.5rem; font-size:.9rem; font-weight:700; color:var(--c-text); margin-bottom:.85rem; }
    .disc-dot { width:9px; height:9px; border-radius:50%; }
    .disc-dot-active { background:#10b981; } .disc-dot-inactive { background:#94a3b8; } .disc-dot-expired { background:#ef4444; }
    .disc-group-count { font-size:.72rem; color:var(--c-muted); background:var(--c-soft); padding:.05rem .5rem; border-radius:1rem; }
    .disc-group-empty { font-size:.8rem; color:var(--c-muted); padding:.5rem 0; }
    .disc-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:1rem; }
    .disc-card {
      background:var(--c-surface); border:1px solid var(--c-border); border-radius:var(--r);
      padding:1.1rem 1.2rem; box-shadow:var(--shadow);
    }
    .disc-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:.5rem; margin-bottom:.6rem; }
    .disc-card-name { font-weight:700; color:var(--c-text); font-size:.95rem; }
    .disc-card-val { font-weight:800; color:var(--c-primary); font-size:.95rem; white-space:nowrap; }
    .disc-card-meta { display:flex; flex-direction:column; gap:.25rem; font-size:.74rem; color:var(--c-muted); margin-bottom:.6rem; }
    .disc-card-actions { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:.8rem; padding-top:.75rem; border-top:1px solid var(--c-border); }
    .disc-card-actions .btn-action { font-size:.74rem; }
    .btn-del:hover { color:var(--c-danger); border-color:var(--c-danger); }
    .disc-form-row { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
    .modal-foot { display:flex; gap:.6rem; justify-content:flex-end; padding:1rem 1.25rem; border-top:1px solid var(--c-border); }

    /* ══ Responsive ══ */
    /* Tablet */
    @media (max-width:1100px) {
      .kpi-row { grid-template-columns:repeat(2,1fr); }
      .charts-grid { grid-template-columns:1fr; }
      .span-2 { grid-column:1; }
      .menu-layout { grid-template-columns:1fr; }
    }
    /* Mobile */
    @media (max-width:768px) {
      .dash-header-inner { padding:.75rem 1rem; }
      .brand-sub, .user-info { display:none; }
      .user-chip { padding:.35rem .5rem; }
      .logout-label { display:none; }
      .btn-logout { padding:.42rem .55rem; }
      .hdr-toggle-label { display:none; }
      .hdr-toggle { padding:.42rem .55rem; }
      .dash-nav { top:53px; }
      .dash-nav-inner { padding:0 .75rem; }
      .nav-tab { padding:.65rem .75rem; font-size:.8rem; }
      .dash-main { padding:1rem .875rem; }
      .kpi-row { grid-template-columns:repeat(2,1fr); gap:.75rem; }
      .kpi-num { font-size:1.3rem; }
      .period-bar { width:100%; }
      .period-btn { flex:1; text-align:center; padding:.4rem .5rem; font-size:.78rem; }
      .col-items, .col-time { display:none; }
      .orders-card-head { padding:.875rem 1rem; }
      .orders-tbl th, .orders-tbl td { padding:.7rem .875rem; }
    }
    /* Small phone */
    @media (max-width:480px) {
      .kpi-row { grid-template-columns:1fr 1fr; gap:.625rem; }
      .kpi-card { padding:.875rem 1rem; gap:.75rem; }
      .kpi-icon-wrap { width:36px; height:36px; }
      .kpi-num { font-size:1.1rem; }
      .col-pay { display:none; }
      .pay-label { display:none; }
      .btn-pay { padding:.35rem .5rem; }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private api         = inject(ApiService);
  private sock        = inject(SocketService);
  private outletSvc   = inject(OutletService);
  private menuSvc     = inject(MenuService);
  auth = inject(AuthService);
  theme       = inject(ThemeService);
  workingMode = inject(WorkingModeService);
  private sound = inject(NotificationSoundService);

  restaurantInfo = signal<any>(null);

  orders    = signal<any[]>([]);
  sales     = signal<any>(null);
  topItems  = signal<any[]>([]);
  peakHours = signal<any[]>([]);
  peakDays  = signal<any[]>([]);
  error     = signal<string | null>(null);
  activeOrdersCount = signal<number>(0);
  activeTab = signal<'orders'|'tables'|'menu'|'staff'|'favorites'|'outlets'|'tips'|'analytics'|'discounts'>('orders');
  selectedPeriod = 'day';

  // Tips
  tips        = signal<any[]>([]);
  tipsLoading = signal(false);
  tipsTotal   = computed(() => this.tips().reduce((s, t) => s + (t.amount || 0), 0));

  // Outlet state (for OWNER/MANAGER)
  outlets         = signal<Outlet[]>([]);
  selectedOutletId = signal<string | null>(null);
  outletStats     = signal<any>(null);
  consolidatedData = signal<any>(null);
  showOutletForm    = signal(false);
  editingOutlet     = signal<Outlet | null>(null);
  outletForm = { name: '', address: '', phone: '', email: '', tableLimit: 0 };
  outletStaffAccounts: { name: string; email: string; password: string; role: string }[] = [];
  tableAvailability = signal<import('../../core/services/outlet.service').TableAvailability | null>(null);

  // Bill-level taxes state
  billTaxRows = signal<{ _id?: string; name: string; rate: number; type: 'PERCENTAGE' | 'FLAT'; enabled: boolean }[]>([]);
  savingBillTaxes = signal(false);
  deletingTaxId = signal<string | null>(null);
  logoUrl = signal<string | null>(null);
  logoPublicId = signal<string | null>(null);
  savingLogo = signal(false);

  // Waiter notification state
  pendingServiceOrders = signal<any[]>([]);
  showNotifications    = signal(false);

  // Waiter "Order Ready" popup: a queue of ready orders shown as a centered modal,
  // one at a time, until acted on or dismissed. Deduped so the same order never
  // pops or beeps twice (socket + polling can both deliver it).
  readyQueue   = signal<any[]>([]);
  private seenReadyOrders = new Set<string>();
  activeReady = computed(() => this.readyQueue()[0] || null);
  isWaiter() { return this.auth.user()?.role === 'WAITER'; }
  // Working Mode is available to Owner and Waiter only (not Manager / Kitchen).
  canUseWorkingMode() { return ['OWNER', 'WAITER'].includes(this.auth.user()?.role || ''); }
  inWorkingMode = computed(() => this.canUseWorkingMode() && this.workingMode.enabled());

  receiptOrder   = signal<any | null>(null);
  receiptLoading = signal(false);
  receiptError   = signal<string | null>(null);

  // Order history modal
  historyOrder = signal<any | null>(null);

  // Payment modal
  payOrder       = signal<any | null>(null);
  payingOrder    = signal(false);
  payError       = signal<string | null>(null);
  selectedPayMode = 'CASH';
  payModes = [
    { value:'CASH',  icon:'💵', label:'Cash' },
    { value:'CARD',  icon:'💳', label:'Card' },
    { value:'UPI',   icon:'📱', label:'UPI' },
    { value:'OTHER', icon:'🔄', label:'Other' },
  ];

  // Favorites
  favRows       = signal<any[]>([]);
  favLoading    = signal(false);
  favPeriod     = 'week';
  favItemSearch = '';
  favOutletId   = '';

  // Customer discount assignment (Favourites)
  selectedMobiles = signal<Set<string>>(new Set());
  discountsByCustomer = signal<Record<string, any[]>>({});
  showAssignModal = signal(false);
  assignTargets = signal<string[]>([]);
  assignDiscountId = '';
  assignSaving = signal(false);

  // Discounts module
  discounts = signal<{ all: any[]; active: any[]; inactive: any[]; expired: any[] }>({ all: [], active: [], inactive: [], expired: [] });
  activeDiscounts = computed(() => this.discounts().active);
  // Discounts that can be assigned from Favourites: anything not expired (active
  // discounts apply now; inactive/not-yet-started ones apply once enabled/in-window).
  assignableDiscounts = computed(() => [...this.discounts().active, ...this.discounts().inactive]);
  discountsLoading = signal(false);
  discountForm: any = this.blankDiscount();
  editingDiscountId = signal<string | null>(null);
  showDiscountForm = signal(false);
  discountSaving = signal(false);

  // Customer profile modal
  customerProfile = signal<any | null>(null);

  private revenueChart: Chart | null = null;
  private itemsChart:   Chart | null = null;
  private hoursChart:   Chart | null = null;
  private daysChart:    Chart | null = null;
  private timer: any;

  // ── Advanced analytics tab state ──
  overview  = signal<any | null>(null);
  anLoading = signal(false);
  anRange   = signal<string>('today');
  anFrom = '';
  anTo = '';
  rangeOptions = [
    { key: 'today',      label: 'Today'      },
    { key: 'yesterday',  label: 'Yesterday'  },
    { key: 'last7',      label: 'Last 7 Days'  },
    { key: 'last30',     label: 'Last 30 Days' },
    { key: 'this_month', label: 'This Month'   },
    { key: 'last_month', label: 'Last Month'   },
    { key: 'custom',     label: 'Custom'       },
  ];
  private anCharts: Chart[] = [];

  periods = [
    { value:'day',   label:'Today' },
    { value:'week',  label:'This Week' },
    { value:'month', label:'This Month' },
    { value:'year',  label:'This Year' },
  ];
  periodLabels: Record<string,string> = {
    day:'Today', week:'This week', month:'This month', year:'This year'
  };

  constructor() {
    effect(() => {
      this.activeOrdersCount.set(
        this.orders().filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length
      );
    });

    // Working Mode hides every secondary tab — snap back to Orders so the user
    // is never stranded on a tab that just disappeared.
    effect(() => {
      if (this.inWorkingMode() && this.activeTab() !== 'orders') {
        this.activeTab.set('orders');
      }
    }, { allowSignalWrites: true });

    // Redraw charts after data arrives
    effect(() => {
      const t = this.sales()?.trend;
      if (t?.length) this.later(() => this.drawRevenue(t));
    });
    effect(() => {
      const it = this.topItems();
      if (it.length) this.later(() => this.drawItems(it));
    });
    effect(() => {
      const h = this.peakHours();
      if (h.length) this.later(() => this.drawHours(h));
    });
    effect(() => {
      const d = this.peakDays();
      if (d.length) this.later(() => this.drawDays(d));
    });
    // Re-theme analytics charts when the user toggles dark/light while viewing them.
    effect(() => {
      this.theme.theme();
      const ov = this.overview();
      if (ov && this.activeTab() === 'analytics') this.later(() => this.drawAnalytics(ov));
    });
  }

  ngOnInit() {
    this.api.get<any>('/tenant/restaurant/profile').subscribe({
      next: ({ data }) => {
        this.restaurantInfo.set(data);
        if (Array.isArray(data.billTaxes)) {
          this.billTaxRows.set(data.billTaxes.map((t: any) => ({
            _id: t._id,
            name: t.name,
            rate: t.rate,
            type: t.type || 'PERCENTAGE',
            enabled: t.enabled !== false
          })));
        }
        this.logoUrl.set(data.logoUrl || null);
        this.logoPublicId.set(data.logoPublicId || null);
      }
    });
    this.loadOrders();
    if (this.isManager()) {
      this.loadSales(); this.loadItems(); this.loadTime();
      this.loadOutlets();
    }
    this.sock.joinStaffRoom();
    this.sock.on('order:new').subscribe(()      => this.loadOrders());
    this.sock.on('order:updated').subscribe(()  => this.loadOrders());
    this.sock.on('payment:recorded').subscribe(() => {
      this.loadOrders();
      if (this.isManager()) this.loadSales();
    });
    // Waiter notification: kitchen finished an order and it's ready to serve.
    // Only waiters get the centered "Order Ready" popup + sound; owners/managers
    // just see it in their monitoring panel. Deduped per order.
    this.sock.on<any>('order:ready_to_serve').subscribe(notification => {
      this.pendingServiceOrders.update(list =>
        list.some(n => n.orderId === notification.orderId) ? list : [notification, ...list]
      );
      if (this.isWaiter()) this.enqueueReady(notification);
    });
    // New tip from a customer — refresh the tips table + nav pill total
    this.sock.on('tip:new').subscribe(() => this.loadTips());
    this.loadTips();
    this.timer = setInterval(() => {
      this.loadOrders();
      if (this.isManager()) { this.loadSales(); this.loadItems(); this.loadTime(); }
    }, 30_000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
    [this.revenueChart, this.itemsChart, this.hoursChart, this.daysChart]
      .forEach(c => c?.destroy());
    this.anCharts.forEach(c => c.destroy());
    this.sound.stop();
  }

  // ── Outlet methods ──────────────────────────────────
  loadOutlets() {
    this.outletSvc.getOutlets().subscribe({
      next: v => {
        this.outlets.set(v);
        // OWNER: auto-select Main Branch (first outlet) on first load so orders/analytics
        // are scoped to one outlet by default, not mixed across all outlets.
        if (this.auth.user()?.role === 'OWNER' && !this.selectedOutletId() && v.length > 0) {
          this.selectOutlet(v[0]._id);
        }
      },
      error: e => console.error(e)
    });
  }

  selectOutlet(id: string | null) {
    this.selectedOutletId.set(id);
    // Sync menu service so menu tab shows the selected outlet's items
    this.menuSvc.selectedOutletId.set(id);
    this.loadOrders();
    if (this.isManager()) { this.loadSales(); this.loadItems(); this.loadTime(); }
    if (this.activeTab() === 'analytics') this.loadOverview();
    if (id) {
      this.outletSvc.getOutletStats(id).subscribe({ next: v => this.outletStats.set(v), error: e => console.error(e) });
    } else {
      this.outletStats.set(null);
      this.outletSvc.getConsolidated(this.selectedPeriod).subscribe({ next: v => this.consolidatedData.set(v), error: e => console.error(e) });
    }
  }

  openOutletForm(outlet: Outlet | null = null) {
    this.editingOutlet.set(outlet);
    this.outletForm = outlet
      ? { name: outlet.name, address: outlet.address, phone: outlet.phone || '', email: outlet.email || '', tableLimit: outlet.tableLimit || 0 }
      : { name: '', address: '', phone: '', email: '', tableLimit: 0 };
    // For edit: load existing staff of this outlet; for create: start with one blank row
    if (outlet) {
      this.outletStaffAccounts = [];
      this.api.get<any[]>(`/tenant/staff?outletId=${outlet._id}`).subscribe({
        next: ({ data }) => {
          this.outletStaffAccounts = (data || []).map((u: any) => ({ name: u.name, email: u.email, password: '', role: u.role }));
        },
        error: () => { this.outletStaffAccounts = []; }
      });
    } else {
      this.outletStaffAccounts = [{ name: '', email: '', password: '', role: 'WAITER' }];
    }
    this.tableAvailability.set(null);
    this.outletSvc.getTableAvailability().subscribe({ next: d => this.tableAvailability.set(d), error: () => {} });
    this.showOutletForm.set(true);
  }

  addStaffRow() { this.outletStaffAccounts = [...this.outletStaffAccounts, { name: '', email: '', password: '', role: 'WAITER' }]; }
  removeStaffRow(i: number) { this.outletStaffAccounts = this.outletStaffAccounts.filter((_, idx) => idx !== i); }

  availableForOutlet(): number {
    const avail = this.tableAvailability();
    if (!avail) return 0;
    const editing = this.editingOutlet();
    const currentAlloc = editing ? (editing.tableLimit || 0) : 0;
    return avail.remaining + currentAlloc;
  }

  saveOutlet() {
    const editing = this.editingOutlet();
    const staffAccounts = this.outletStaffAccounts.filter(s => s.email);
    const payload: any = { ...this.outletForm, tableLimit: Number(this.outletForm.tableLimit) || 0 };
    if (staffAccounts.length) payload['staffAccounts'] = staffAccounts;
    const obs = editing
      ? this.outletSvc.updateOutlet(editing._id, payload)
      : this.outletSvc.createOutlet(payload);
    obs.subscribe({ next: () => { this.showOutletForm.set(false); this.loadOutlets(); }, error: e => alert(e?.error?.message || 'Failed to save outlet') });
  }

  toggleOutletStatus(outlet: Outlet) {
    this.outletSvc.toggleOutlet(outlet._id).subscribe({ next: () => this.loadOutlets(), error: e => console.error(e) });
  }

  // ── Restaurant logo ──────────────────────────────────
  saveLogo() {
    if (!this.logoUrl()) return;
    this.savingLogo.set(true);
    this.api.patch<any>('/tenant/restaurant/logo', { logoUrl: this.logoUrl(), logoPublicId: this.logoPublicId() }).subscribe({
      next: ({ data }) => {
        this.savingLogo.set(false);
        this.restaurantInfo.update(r => r ? { ...r, logoUrl: data.logoUrl } : r);
        alert('Restaurant logo saved successfully.');
      },
      error: e => {
        this.savingLogo.set(false);
        alert(e?.error?.message || 'Failed to save logo.');
      }
    });
  }

  // ── Bill-level tax methods ──────────────────────────────────
  addBillTax() {
    this.billTaxRows.update(rows => [...rows, { name: '', rate: 0, type: 'PERCENTAGE', enabled: true }]);
  }

  removeBillTax(i: number) {
    const row = this.billTaxRows()[i];
    if (!row?._id) {
      // Never saved to the DB yet — just drop it locally.
      this.billTaxRows.update(rows => rows.filter((_, idx) => idx !== i));
      return;
    }
    this.deletingTaxId.set(row._id);
    this.api.delete<any>(`/tenant/restaurant/bill-taxes/${row._id}`).subscribe({
      next: ({ data }) => {
        this.deletingTaxId.set(null);
        this.billTaxRows.set((data || []).map((t: any) => ({
          _id: t._id,
          name: t.name,
          rate: t.rate,
          type: t.type || 'PERCENTAGE',
          enabled: t.enabled !== false
        })));
        this.restaurantInfo.update(r => r ? { ...r, billTaxes: data } : r);
      },
      error: e => {
        this.deletingTaxId.set(null);
        alert(e?.error?.message || 'Failed to delete tax.');
      }
    });
  }

  updateBillTaxField(i: number, field: string, value: any) {
    this.billTaxRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  saveBillTaxes() {
    const rows = this.billTaxRows();
    for (const t of rows) {
      if (!t.name.trim()) { alert('Each bill tax must have a name.'); return; }
      if (t.rate < 0) { alert('Tax rate cannot be negative.'); return; }
    }
    this.savingBillTaxes.set(true);
    this.api.patch<any>('/tenant/restaurant/bill-taxes', { billTaxes: rows }).subscribe({
      next: ({ data }) => {
        this.savingBillTaxes.set(false);
        this.restaurantInfo.update(r => r ? { ...r, billTaxes: data } : r);
        alert('Bill taxes saved successfully.');
      },
      error: e => {
        this.savingBillTaxes.set(false);
        alert(e?.error?.message || 'Failed to save bill taxes.');
      }
    });
  }

  // Waiter: dismiss notification after marking served
  dismissNotification(orderId: string) {
    this.pendingServiceOrders.update(list => list.filter(n => n.orderId !== orderId));
    this.readyQueue.update(list => list.filter(n => n.orderId !== orderId));
    this.syncRinging();
  }

  /** Ring while any ready popup remains; stop once the last one is handled. */
  private syncRinging() {
    if (this.isWaiter() && this.readyQueue().length > 0) this.sound.start();
    else this.sound.stop();
  }

  markServed(notification: any) {
    this.api.patch(`/tenant/orders/${notification.orderId}/status`, { status: 'SERVED' }).subscribe({
      next: () => { this.dismissNotification(notification.orderId); this.loadOrders(); },
      error: e => console.error(e)
    });
  }

  // ── Order Ready popup queue (waiter) ───────────────────────────
  /** Enqueue a ready order for the centered popup + play the alert (deduped). */
  private enqueueReady(n: any) {
    const id = String(n.orderId);
    if (this.seenReadyOrders.has(id)) return;
    this.seenReadyOrders.add(id);
    this.readyQueue.update(list => [...list, n]);
    this.syncRinging();
  }

  /** Complete (serve) the order shown in the popup; advances to the next queued one. */
  completeReady(n: any) {
    this.api.patch(`/tenant/orders/${n.orderId}/status`, { status: 'SERVED' }).subscribe({
      next: () => { this.dismissNotification(n.orderId); this.loadOrders(); },
      error: e => alert(e?.error?.message || 'Could not mark the order as served.')
    });
  }

  /** Cancel the order shown in the popup. */
  cancelReady(n: any) {
    if (!confirm(`Cancel order #${n.orderNumber}? This cannot be undone.`)) return;
    this.api.patch(`/tenant/orders/${n.orderId}/status`, { status: 'CANCELLED' }).subscribe({
      next: () => { this.dismissNotification(n.orderId); this.loadOrders(); },
      error: e => alert(e?.error?.message || 'Could not cancel the order.')
    });
  }

  /** Manually close the popup without acting (order stays in the bell list). */
  closeReadyPopup(n: any) {
    this.readyQueue.update(list => list.filter(o => o.orderId !== n.orderId));
    this.syncRinging();
  }

  // ── Advanced analytics tab ─────────────────────────────────────
  setRange(key: string) {
    this.anRange.set(key);
    if (key !== 'custom') this.loadOverview();
  }

  loadOverview() {
    if (!this.isManager()) return;
    const range = this.anRange();
    const params: string[] = [`range=${range}`];
    if (range === 'custom') {
      if (!this.anFrom || !this.anTo) return;       // wait for both dates
      params.push(`from=${this.anFrom}`, `to=${this.anTo}`);
    }
    const outletId = this.selectedOutletId();
    if (outletId) params.push(`outletId=${outletId}`);

    this.anLoading.set(true);
    this.api.get<any>(`/tenant/analytics/overview?${params.join('&')}`).subscribe({
      next: ({ data }) => {
        this.overview.set(data);
        this.anLoading.set(false);
        this.later(() => this.drawAnalytics(data));
      },
      error: () => { this.anLoading.set(false); this.overview.set(null); }
    });
  }

  private themedChartColors() {
    const dark = this.theme.theme() === 'dark';
    return {
      grid: dark ? 'rgba(148,163,184,.15)' : '#f3f4f6',
      tick: dark ? '#94a3b8' : '#9ca3af',
      text: dark ? '#f1f5f9' : '#111827'
    };
  }

  private drawAnalytics(ov: any) {
    this.anCharts.forEach(c => c.destroy());
    this.anCharts = [];
    const palette = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6'];
    const c = this.themedChartColors();
    const mk = (id: string, cfg: any) => {
      const el = this.canvas(id); if (!el) return;
      this.anCharts.push(new Chart(el, cfg));
    };
    const baseScales = {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: c.tick, maxRotation: 0 } },
      y: { grid: { color: c.grid }, ticks: { font: { size: 10 }, color: c.tick } }
    };

    // Revenue & orders trend
    mk('anRevenueChart', {
      type: 'line',
      data: {
        labels: ov.revenueTrend.map((t: any) => t._id),
        datasets: [
          { label: 'Revenue (₹)', data: ov.revenueTrend.map((t: any) => +(t.revenue || 0).toFixed(0)),
            borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,.1)', fill: true, tension: .4, borderWidth: 2.5, pointRadius: 3, yAxisID: 'y' },
          { label: 'Orders', data: ov.revenueTrend.map((t: any) => t.orders || 0),
            borderColor: '#10b981', borderDash: [5, 4], fill: false, tension: .4, borderWidth: 2, pointRadius: 2, yAxisID: 'y1' }
        ]
      },
      options: { responsive: true, maintainAspectRatio: true, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: c.text, font: { size: 11 }, usePointStyle: true, boxWidth: 12 } } },
        scales: { x: baseScales.x, y: { ...baseScales.y, position: 'left' },
          y1: { position: 'right', grid: { display: false }, ticks: { font: { size: 10 }, color: c.tick, precision: 0 } } } }
    });

    // Completed vs cancelled (doughnut)
    const completed = ov.summary.completed || 0, cancelled = ov.summary.cancelled || 0;
    const inProgress = Math.max(0, (ov.summary.orders || 0) - completed - cancelled);
    mk('anStatusChart', {
      type: 'doughnut',
      data: { labels: ['Completed', 'Cancelled', 'In Progress'],
        datasets: [{ data: [completed, cancelled, inProgress], backgroundColor: ['#10b981', '#ef4444', '#f59e0b'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: true, cutout: '62%',
        plugins: { legend: { position: 'bottom', labels: { color: c.text, font: { size: 11 }, usePointStyle: true, boxWidth: 10, padding: 12 } } } }
    });

    // Top products (horizontal bar)
    const top = ov.topProducts.slice(0, 6);
    mk('anTopChart', {
      type: 'bar',
      data: { labels: top.map((i: any) => i.name?.length > 14 ? i.name.slice(0, 14) + '…' : i.name),
        datasets: [{ label: 'Qty', data: top.map((i: any) => i.qty), backgroundColor: palette.map(p => p + '33'), borderColor: palette, borderWidth: 2, borderRadius: 5 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: baseScales }
    });

    // Category performance (bar by revenue)
    const cats = ov.categoryPerformance.slice(0, 6);
    mk('anCategoryChart', {
      type: 'bar',
      data: { labels: cats.map((c2: any) => c2.name),
        datasets: [{ label: 'Revenue', data: cats.map((c2: any) => +(c2.revenue || 0).toFixed(0)), backgroundColor: palette.map(p => p + '33'), borderColor: palette, borderWidth: 2, borderRadius: 5 }] },
      options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: baseScales }
    });

    // Peak hours
    const hourLabels = Array.from({ length: 24 }, (_, h) => `${h}:00`);
    const hourData = hourLabels.map((_, h) => { const row = ov.peakHours.find((x: any) => x._id === h); return row ? row.orders : 0; });
    mk('anHoursChart', {
      type: 'bar',
      data: { labels: hourLabels, datasets: [{ label: 'Orders', data: hourData, backgroundColor: 'rgba(79,70,229,.6)', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: baseScales }
    });

    // Payment mix
    if (ov.paymentMix?.length) {
      mk('anPaymentChart', {
        type: 'doughnut',
        data: { labels: ov.paymentMix.map((p: any) => p._id || 'Other'),
          datasets: [{ data: ov.paymentMix.map((p: any) => +(p.amount || 0).toFixed(0)), backgroundColor: palette, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: true, cutout: '62%',
          plugins: { legend: { position: 'bottom', labels: { color: c.text, font: { size: 11 }, usePointStyle: true, boxWidth: 10, padding: 12 } } } }
      });
    }
  }

  // Mark a READY_TO_SERVE order as SERVED directly from the orders table
  markOrderServed(order: any) {
    this.api.patch(`/tenant/orders/${order._id}/status`, { status: 'SERVED' }).subscribe({
      next: () => {
        this.dismissNotification(order._id);
        this.loadOrders();
      },
      error: (e: any) => this.error.set(e?.error?.message || 'Failed to mark as served')
    });
  }

  // ── Tips ────────────────────────────────────────────
  loadTips() {
    this.tipsLoading.set(true);
    this.api.get<any>('/tenant/tips').subscribe({
      next: ({ data }) => {
        this.tips.set(data?.tips || []);
        this.tipsLoading.set(false);
      },
      error: () => this.tipsLoading.set(false)
    });
  }

  // ── Loaders ─────────────────────────────────────────
  loadOrders() {
    const params: any = { limit: 50 };
    const oid = this.selectedOutletId();
    if (oid) params['outletId'] = oid;
    this.api.get<any[]>('/tenant/orders', params).subscribe({
      next: ({ data }) => this.orders.set(data),
      error: e => console.error(e)
    });
  }
  loadSales() {
    const params: any = { period: this.selectedPeriod };
    const oid = this.selectedOutletId();
    if (oid) params['outletId'] = oid;
    this.api.get<any>('/tenant/analytics/sales', params).subscribe({
      next: ({ data }) => this.sales.set(data),
      error: e => console.error(e)
    });
  }
  loadItems() {
    const params: any = { period: this.selectedPeriod };
    const oid = this.selectedOutletId();
    if (oid) params['outletId'] = oid;
    this.api.get<any>('/tenant/analytics/items', params).subscribe({
      next: ({ data }) => this.topItems.set(data?.top10 || []),
      error: e => console.error(e)
    });
  }
  loadTime() {
    const params: any = { period: this.selectedPeriod };
    const oid = this.selectedOutletId();
    if (oid) params['outletId'] = oid;
    this.api.get<any>('/tenant/analytics/time', params).subscribe({
      next: ({ data }) => { this.peakHours.set(data?.byHour || []); this.peakDays.set(data?.byDayOfWeek || []); },
      error: e => console.error(e)
    });
  }
  loadFavorites() {
    const params: any = { period: this.favPeriod, limit: 100 };
    // OWNER: use favOutletId dropdown (empty = all outlets); MANAGER: backend auto-scopes to their outlet
    if (this.isOwner() && this.favOutletId) params['outletId'] = this.favOutletId;
    if (this.favItemSearch.trim()) params['item'] = this.favItemSearch.trim();
    this.favLoading.set(true);
    this.api.get<any>('/tenant/analytics/customers/favorites', params).subscribe({
      next: ({ data }) => { this.favRows.set(data?.rows ?? data); this.favLoading.set(false); },
      error: e => { console.error(e); this.favLoading.set(false); }
    });
    this.loadDiscountsByCustomer();
    this.loadDiscounts();
  }

  // ── Favourites: selection + discount assignment ────────────────
  loadDiscountsByCustomer() {
    const params: any = {};
    if (this.isOwner() && this.favOutletId) params['outletId'] = this.favOutletId;
    this.api.get<any>('/tenant/discounts/by-customer', params).subscribe({
      next: ({ data }) => this.discountsByCustomer.set(data || {}),
      error: () => this.discountsByCustomer.set({})
    });
  }

  discountsFor(mobile: string): any[] {
    const key = String(mobile || '').replace(/\D/g, '');
    return this.discountsByCustomer()[key] || this.discountsByCustomer()[mobile] || [];
  }

  toggleSelect(mobile: string) {
    this.selectedMobiles.update(set => {
      const next = new Set(set);
      next.has(mobile) ? next.delete(mobile) : next.add(mobile);
      return next;
    });
  }

  allSelected() {
    const rows = this.favRows();
    return rows.length > 0 && rows.every(r => this.selectedMobiles().has(r.mobileNumber));
  }

  toggleSelectAll(ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    this.selectedMobiles.set(checked ? new Set(this.favRows().map(r => r.mobileNumber)) : new Set());
  }

  clearSelection() { this.selectedMobiles.set(new Set()); }

  /** Open the assign modal for a single mobile, or for the current bulk selection. */
  openAssignDiscount(mobile: string | null) {
    const targets = mobile ? [mobile] : [...this.selectedMobiles()];
    if (!targets.length) return;
    this.assignTargets.set(targets);
    this.assignDiscountId = '';
    this.showAssignModal.set(true);
    this.loadDiscounts();   // always refresh so newly-created discounts show up
  }

  closeAssignModal() { this.showAssignModal.set(false); }

  confirmAssignDiscount() {
    if (!this.assignDiscountId) return;
    this.assignSaving.set(true);
    this.api.post<any>('/tenant/discounts/assign-bulk', {
      discountId: this.assignDiscountId,
      mobiles: this.assignTargets()
    }).subscribe({
      next: () => {
        this.assignSaving.set(false);
        this.showAssignModal.set(false);
        this.clearSelection();
        this.loadDiscountsByCustomer();
      },
      error: e => { this.assignSaving.set(false); alert(e?.error?.message || 'Could not assign the discount.'); }
    });
  }

  // ── Discounts module ───────────────────────────────────────────
  blankDiscount() {
    return { name: '', type: 'PERCENTAGE', value: null as number | null, startDate: '', expiryDate: '', outletId: '' };
  }

  loadDiscounts() {
    const params: any = {};
    if (this.isOwner() && this.favOutletId) params['outletId'] = this.favOutletId;
    this.discountsLoading.set(true);
    this.api.get<any>('/tenant/discounts', params).subscribe({
      next: ({ data }) => { this.discounts.set(data); this.discountsLoading.set(false); },
      error: () => this.discountsLoading.set(false)
    });
  }

  openDiscountForm(d?: any) {
    if (d) {
      this.editingDiscountId.set(d._id);
      this.discountForm = {
        name: d.name, type: d.type, value: d.value,
        startDate: d.startDate ? d.startDate.slice(0, 10) : '',
        expiryDate: d.expiryDate ? d.expiryDate.slice(0, 10) : '',
        outletId: d.outletId || ''
      };
    } else {
      this.editingDiscountId.set(null);
      this.discountForm = this.blankDiscount();
    }
    this.showDiscountForm.set(true);
  }

  closeDiscountForm() { this.showDiscountForm.set(false); }

  saveDiscount() {
    const f = this.discountForm;
    if (!f.name?.trim()) { alert('Please enter a discount name.'); return; }
    if (!(Number(f.value) > 0)) { alert('Discount value must be greater than zero.'); return; }
    if (f.type === 'PERCENTAGE' && Number(f.value) > 100) { alert('A percentage discount cannot exceed 100%.'); return; }

    const body: any = {
      name: f.name.trim(), type: f.type, value: Number(f.value),
      startDate: f.startDate || null, expiryDate: f.expiryDate || null
    };
    if (this.isOwner() && (f.outletId || this.favOutletId)) body.outletId = f.outletId || this.favOutletId;

    this.discountSaving.set(true);
    const id = this.editingDiscountId();
    const req$ = id
      ? this.api.patch<any>(`/tenant/discounts/${id}`, body)
      : this.api.post<any>('/tenant/discounts', body);
    req$.subscribe({
      next: () => { this.discountSaving.set(false); this.showDiscountForm.set(false); this.loadDiscounts(); this.loadDiscountsByCustomer(); },
      error: e => { this.discountSaving.set(false); alert(e?.error?.message || 'Could not save the discount.'); }
    });
  }

  toggleDiscount(d: any) {
    this.api.patch<any>(`/tenant/discounts/${d._id}/toggle`, {}).subscribe({
      next: () => { this.loadDiscounts(); this.loadDiscountsByCustomer(); },
      error: e => alert(e?.error?.message || 'Could not update the discount.')
    });
  }

  deleteDiscount(d: any) {
    if (!confirm(`Delete discount "${d.name}"? Assigned customers will stop receiving it.`)) return;
    this.api.delete<any>(`/tenant/discounts/${d._id}`).subscribe({
      next: () => { this.loadDiscounts(); this.loadDiscountsByCustomer(); },
      error: e => alert(e?.error?.message || 'Could not delete the discount.')
    });
  }

  /** Remove one mobile from a discount's assignment list (customer visibility panel). */
  unassignMobile(d: any, mobile: string) {
    this.api.patch<any>(`/tenant/discounts/${d._id}/assign`, { mobiles: [mobile], mode: 'remove' }).subscribe({
      next: () => { this.loadDiscounts(); this.loadDiscountsByCustomer(); },
      error: e => alert(e?.error?.message || 'Could not update the assignment.')
    });
  }

  setPeriod(p: string) {
    this.selectedPeriod = p;
    this.loadSales(); this.loadItems(); this.loadTime();
  }

  // ── Order History ───────────────────────────────────
  viewHistory(order: any) { this.historyOrder.set(order); }
  closeHistory()          { this.historyOrder.set(null); }

  // ── Payment Modal ────────────────────────────────────
  openPayModal(order: any) {
    this.payOrder.set(order);
    this.payError.set(null);
    this.selectedPayMode = 'CASH';
  }
  closePayModal() { this.payOrder.set(null); }

  confirmPay() {
    const order = this.payOrder();
    if (!order) return;
    this.payingOrder.set(true);
    this.payError.set(null);
    this.api.post('/tenant/payments/mark-paid', {
      sessionId: order.sessionId,
      orderId: order._id,
      method: this.selectedPayMode
    }).subscribe({
      next: () => {
        this.payingOrder.set(false);
        this.payOrder.set(null);
        this.loadOrders();
      },
      error: (e: any) => {
        this.payingOrder.set(false);
        this.payError.set(e?.error?.message || 'Unable to mark order paid');
      }
    });
  }

  // Legacy single-click pay kept for backwards compat
  markPaid(order: any) { this.openPayModal(order); }

  // ── Receipt ──────────────────────────────────────────
  viewReceipt(order: any) {
    this.receiptError.set(null);
    this.receiptLoading.set(true);
    this.api.get<any>(`/tenant/orders/${order._id}/receipt`).subscribe({
      next: ({ data }) => { this.receiptOrder.set(data); this.receiptLoading.set(false); },
      error: (e: any) => { this.receiptLoading.set(false); this.receiptError.set(e?.error?.message || 'Unable to load receipt'); }
    });
  }
  closeReceipt()  { this.receiptOrder.set(null); }

  printReceipt() {
    const r = this.receiptOrder();
    if (!r) return;

    const items = (r.order?.items || [])
      .filter((i: any) => i.status !== 'CANCELLED')
      .map((i: any) => `
        <tr>
          <td>${i.name}${i.variant?.name ? ` <span style="color:#666;font-size:10px;">(${i.variant.name})</span>` : ''}</td>
          <td style="text-align:right">${i.qty}</td>
          <td style="text-align:right">${(+i.unitPrice).toFixed(2)}</td>
          <td style="text-align:right">${(+i.lineTotal).toFixed(2)}</td>
        </tr>`).join('');

    const taxes = (r.order?.taxes || [])
      .filter((t: any) => (t.amount || 0) > 0)
      .map((t: any) => `<div style="display:flex;justify-content:space-between;font-size:11px;padding:.15rem 0;color:#555;"><span>${t.name}</span><span>₹${(+t.amount).toFixed(2)}</span></div>`)
      .join('');

    const logo = r.restaurant?.logoUrl
      ? `<img src="${r.restaurant.logoUrl}" style="width:64px;height:64px;object-fit:contain;border-radius:8px;margin-bottom:.5rem;">`
      : '';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Receipt #${r.order?.orderNumber}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; font-size: 12px; color: #111; background: #fff; }
        .rcpt { max-width: 320px; margin: 0 auto; padding: 16px; text-align: center; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin: .5rem 0; }
        th { border-bottom: 1px dashed #999; padding: .25rem .1rem; font-weight: bold; text-align: left; }
        td { padding: .2rem .1rem; vertical-align: top; }
        .num { text-align: right; }
        .divider { color: #666; margin: .5rem 0; font-size: 10px; overflow: hidden; }
        .details { text-align: left; margin: .5rem 0; }
        .row { display: flex; justify-content: space-between; font-size: 11px; padding: .15rem 0; }
        .row span:first-child { color: #666; }
        .row span:last-child { font-weight: 600; }
        .grand { font-size: 14px; font-weight: bold; padding: .5rem 0; }
        @media print { @page { margin: 8mm; } }
      </style>
    </head><body><div class="rcpt">
      ${logo}
      <div style="font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.2rem;">${r.restaurant?.name || ''}</div>
      ${r.restaurant?.address ? `<div style="font-size:11px;color:#444;margin:.1rem 0;">${r.restaurant.address}</div>` : ''}
      ${r.restaurant?.phone ? `<div style="font-size:11px;color:#444;margin:.1rem 0;">📞 ${r.restaurant.phone}</div>` : ''}
      ${r.restaurant?.gstin ? `<div style="font-size:11px;color:#444;margin:.1rem 0;">GSTIN: ${r.restaurant.gstin}</div>` : ''}
      ${r.restaurant?.email ? `<div style="font-size:11px;color:#444;margin:.1rem 0;">${r.restaurant.email}</div>` : ''}
      <div class="divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
      <div style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.06em;margin:.2rem 0;">TAX INVOICE</div>
      <div class="divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
      <div class="details">
        <div class="row"><span>Order #</span><span>${r.order?.orderNumber}</span></div>
        <div class="row"><span>Table</span><span>${r.table?.name || ('Table ' + r.table?.number)}</span></div>
        ${r.order?.customerSessionId?.customerName ? `<div class="row"><span>Customer</span><span>${r.order.customerSessionId.customerName}</span></div>` : ''}
        ${r.order?.customerSessionId?.mobileNumber ? `<div class="row"><span>Mobile</span><span>${r.order.customerSessionId.mobileNumber}</span></div>` : ''}
        <div class="row"><span>Payment</span><span>${r.order?.paymentMode || r.order?.paymentStatus || ''}</span></div>
        <div class="row"><span>Generated</span><span>${new Date(r.generatedAt || Date.now()).toLocaleString('en-IN')}</span></div>
      </div>
      <div class="divider">───────────────────────────────────</div>
      <table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amt</th></tr></thead>
      <tbody>${items}</tbody></table>
      <div class="divider">───────────────────────────────────</div>
      <div style="text-align:left;">
        <div class="row"><span>Subtotal</span><span>₹${(+r.order?.subtotal || 0).toFixed(2)}</span></div>
        ${taxes}
        <div class="divider">───────────────────────────────────</div>
        <div class="row grand"><span>GRAND TOTAL</span><span>₹${(+r.order?.total || 0).toFixed(2)}</span></div>
      </div>
      <div class="divider">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
      <div style="font-size:12px;font-weight:bold;text-transform:uppercase;margin:.3rem 0;">Thank You!</div>
      ${r.restaurant?.website ? `<div style="font-size:10px;color:#777;margin-top:.15rem;">${r.restaurant.website}</div>` : ''}
    </div></body></html>`;

    const w = window.open('', '_blank', 'width=420,height=700');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.onload = () => { w.print(); w.close(); };
  }


  exportFavorites() {
    const params: any = { period: this.favPeriod };
    if (this.isOwner() && this.favOutletId) params['outletId'] = this.favOutletId;
    if (this.favItemSearch.trim()) params['item'] = this.favItemSearch.trim();
    this.api.get<any[]>('/tenant/analytics/customers/export', params).subscribe({
      next: ({ data }) => this.downloadExcel(data),
      error: () => {}
    });
  }

  private downloadExcel(rows: any[]) {
    if (!rows.length) return;
    const headers = ['Customer Name','Mobile','Visits','Total Orders','Favorite Item','Item Count','Total Spend','Last Visit'];
    const csvRows = [
      headers.join(','),
      ...rows.map(r => [
        `"${r.customerName}"`, r.mobileNumber, r.visits, r.totalOrders,
        `"${r.favoriteItem}"`, r.favoriteItemCount, r.totalSpend,
        r.lastVisit ? new Date(r.lastVisit).toLocaleDateString() : ''
      ].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `favorites-${this.favPeriod}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Customer Profile ─────────────────────────────────
  viewCustomerProfile(mobile: string) {
    this.api.get<any>(`/tenant/analytics/customers/${mobile}`).subscribe({
      next: ({ data }) => this.customerProfile.set(data),
      error: () => {}
    });
  }
  closeCustomerProfile() { this.customerProfile.set(null); }

  addonNames(item: any) {
    return (item?.addons || []).map((a: any) => a.name).join(', ');
  }

  taxNames(item: any) {
    return (item?.taxes || []).map((t: any) => `${t.name || 'Tax'} ${t.amount ?? 0}`).join(', ');
  }

  // ── Charts ──────────────────────────────────────────
  private later(fn: () => void) { setTimeout(fn, 60); }

  private canvas(id: string) { return document.getElementById(id) as HTMLCanvasElement | null; }

  private drawRevenue(trend: any[]) {
    const el = this.canvas('revenueChart'); if (!el) return;
    this.revenueChart?.destroy();

    const labels   = trend.map(t => { const d = new Date(t._id); return `${d.getDate()}/${d.getMonth()+1}`; });
    const revenues = trend.map(t => +(t.revenue || 0).toFixed(0));
    const orders   = trend.map(t => t.orders || 0);

    this.revenueChart = new Chart(el, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue (₹)',
            data: revenues,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79,70,229,.08)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.42,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#4f46e5',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            yAxisID: 'y',
          },
          {
            label: 'Orders',
            data: orders,
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 4],
            fill: false,
            tension: 0.42,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            yAxisID: 'y1',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode:'index', intersect:false },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { font:{ size:11 }, boxWidth:12, padding:16, usePointStyle:true }
          },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,.92)',
            titleFont: { size:11 }, bodyFont: { size:12 },
            padding: 10, cornerRadius: 8,
            callbacks: {
              label: ctx => ctx.datasetIndex === 0
                ? ` ₹${(ctx.parsed.y as number).toLocaleString()}`
                : ` ${ctx.parsed.y} orders`
            }
          }
        },
        scales: {
          x: {
            grid: { display:false },
            ticks: { font:{ size:10 }, color:'#9ca3af', maxRotation:0 }
          },
          y: {
            position: 'left',
            grid: { color:'#f3f4f6' },
            ticks: { font:{ size:10 }, color:'#9ca3af', callback: v => `₹${Number(v).toLocaleString()}` }
          },
          y1: {
            position: 'right',
            grid: { display:false },
            ticks: { font:{ size:10 }, color:'#9ca3af', precision:0 },
            display: orders.some(o => o > 0)
          }
        }
      }
    });
  }

  private drawItems(items: any[]) {
    const el = this.canvas('itemsChart'); if (!el) return;
    this.itemsChart?.destroy();

    const top5    = items.slice(0, 6);
    const palette = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

    this.itemsChart = new Chart(el, {
      type: 'bar',
      data: {
        labels: top5.map(i => i.name.length > 14 ? i.name.slice(0,14)+'…' : i.name),
        datasets: [{
          label: 'Qty sold',
          data: top5.map(i => i.qty),
          backgroundColor: palette.map(c => c + '22'),
          borderColor:     palette,
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display:false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,.92)',
            callbacks: { label: ctx => ` ${ctx.parsed.x} sold` }
          }
        },
        scales: {
          x: { grid: { color:'#f3f4f6' }, ticks: { font:{ size:10 }, color:'#9ca3af', precision:0 } },
          y: { grid: { display:false }, ticks: { font:{ size:10 }, color:'#374151' } }
        }
      }
    });
  }

  private drawHours(byHour: any[]) {
    const el = this.canvas('hoursChart'); if (!el) return;
    this.hoursChart?.destroy();

    const map: Record<number,number> = {};
    byHour.forEach(h => { map[h._id] = h.orders; });
    const data   = Array.from({ length:24 }, (_,i) => map[i] || 0);
    const maxVal = Math.max(...data, 1);
    const labels = Array.from({ length:24 }, (_,i) => `${i}h`);

    this.hoursChart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Orders',
          data,
          backgroundColor: data.map(v => v === maxVal && v > 0 ? '#4f46e5' : 'rgba(79,70,229,.2)'),
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display:false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,.92)',
            callbacks: { label: ctx => ` ${ctx.parsed.y} orders` }
          }
        },
        scales: {
          x: {
            grid: { display:false },
            ticks: { font:{ size:9 }, color:'#9ca3af', maxRotation:0,
                     callback: (_v,i) => i % 6 === 0 ? labels[i] : '' }
          },
          y: { grid: { color:'#f3f4f6' }, ticks: { font:{ size:10 }, color:'#9ca3af', precision:0 }, beginAtZero:true }
        }
      }
    });
  }

  private drawDays(byDay: any[]) {
    const el = this.canvas('daysChart'); if (!el) return;
    this.daysChart?.destroy();

    const map: Record<number,number> = {};
    byDay.forEach(d => { map[d._id] = d.orders; });
    const labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const data   = Array.from({ length:7 }, (_,i) => map[i+1] || 0);
    const maxVal = Math.max(...data, 1);

    this.daysChart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Orders',
          data,
          backgroundColor: data.map(v => v === maxVal && v > 0 ? '#10b981' : 'rgba(16,185,129,.2)'),
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display:false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,.92)',
            callbacks: { label: ctx => ` ${ctx.parsed.y} orders` }
          }
        },
        scales: {
          x: { grid: { display:false }, ticks: { font:{ size:11 }, color:'#374151' } },
          y: { grid: { color:'#f3f4f6' }, ticks: { font:{ size:10 }, color:'#9ca3af', precision:0 }, beginAtZero:true }
        }
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────
  getInitials() { return (this.auth.user()?.name || 'U').charAt(0).toUpperCase(); }

  getRoleClass() {
    const r = this.auth.user()?.role?.toLowerCase();
    return r === 'owner' || r === 'manager' ? 'manager' : 'staff';
  }

  isManager() {
    const r = this.auth.user()?.role;
    return r === 'OWNER' || r === 'MANAGER';
  }

  isOwner() {
    return this.auth.user()?.role === 'OWNER';
  }

  getTimeAgo(date: string) {
    if (!date) return '';
    const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (m < 1)    return 'Just now';
    if (m < 60)   return `${m}m ago`;
    if (m < 1440) return `${Math.floor(m/60)}h ago`;
    return `${Math.floor(m/1440)}d ago`;
  }

  getStatusIcon(s: string) {
    return ({ PENDING:'⏳', PREPARING:'👨‍🍳', READY:'✅', SERVED:'🍽️', COMPLETED:'✓', CANCELLED:'✗' } as any)[s?.toUpperCase()] || '•';
  }

  getOutletName(outletId: string): string {
    return this.outlets().find(o => o._id === outletId)?.name || '';
  }
}
