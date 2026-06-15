import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
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
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, MenuListComponent, CategoryManagerComponent, TableManagementComponent, StaffManagementComponent],
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
          <button class="nav-tab" [class.active]="activeTab() === 'tables'" (click)="activeTab.set('tables')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
              <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
              <circle cx="12" cy="13" r="2"/>
            </svg>
            Tables
          </button>
          <button class="nav-tab" [class.active]="activeTab() === 'menu'" (click)="activeTab.set('menu')">
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
          <button *ngIf="isManager()" class="nav-tab" [class.active]="activeTab() === 'staff'" (click)="activeTab.set('staff')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Staff
          </button>
          <button *ngIf="isManager()" class="nav-tab" [class.active]="activeTab() === 'favorites'" (click)="activeTab.set('favorites'); loadFavorites()">
            ⭐ Favorites
          </button>
          <button *ngIf="auth.user()?.role === 'OWNER'" class="nav-tab" [class.active]="activeTab() === 'outlets'" (click)="activeTab.set('outlets'); loadOutlets()">
            🏪 Outlets
          </button>

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
            🔔
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

      <!-- ── Main ── -->
      <main class="dash-main">

        <!-- ════════ ORDERS TAB ════════ -->
        @if (activeTab() === 'orders') {
          <div class="orders-view">

            @if (isManager()) {
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

            @if (favLoading()) {
              <div class="fav-loading">Loading analytics…</div>
            } @else if (favRows().length === 0) {
              <div class="fav-empty">No data found for this period.</div>
            } @else {
              <div class="table-scroll">
                <table class="orders-tbl fav-tbl">
                  <thead>
                    <tr>
                      <th>Mobile</th>
                      <th>Customer Name</th>
                      <th>Favorite Items</th>
                      <th class="kd-num">Total Orders</th>
                      <th class="kd-num">Total Spend</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of favRows(); track row.mobileNumber) {
                      <tr>
                        <td><span class="cust-phone">{{ row.mobileNumber }}</span></td>
                        <td><span class="cust-name">{{ row.customerName }}</span></td>
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
                          <button class="btn-action btn-hist" (click)="viewCustomerProfile(row.mobileNumber)">
                            👁 Profile
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
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

            <!-- Bill-level taxes -->
            <div style="background:#fff;border-radius:12px;box-shadow:0 1px 6px rgba(0,0,0,.08);padding:20px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div>
                  <div style="font-weight:700;font-size:15px;">Bill Taxes</div>
                  <div style="font-size:12px;color:#6b7280;margin-top:2px;">These taxes are applied once on the full bill total (not per item)</div>
                </div>
                <button (click)="addBillTax()" style="background:#4f46e5;color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:12px;cursor:pointer;font-weight:600;">+ Add Tax</button>
              </div>

              @if (billTaxRows().length === 0) {
                <div style="text-align:center;padding:24px;color:#9ca3af;font-size:13px;">
                  No bill taxes configured. Add GST, Service Charge, etc. that apply to the entire bill.
                </div>
              }

              @for (tax of billTaxRows(); track $index) {
                <div style="display:grid;grid-template-columns:1fr 120px 130px auto auto;gap:8px;align-items:center;margin-bottom:10px;">
                  <input
                    [value]="tax.name"
                    (input)="updateBillTaxField($index, 'name', $any($event.target).value)"
                    placeholder="Tax name (e.g. GST, CGST)"
                    style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;width:100%;box-sizing:border-box;">
                  <select
                    [value]="tax.type"
                    (change)="updateBillTaxField($index, 'type', $any($event.target).value)"
                    style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;background:#fff;width:100%;box-sizing:border-box;">
                    <option value="PERCENTAGE">% of Bill</option>
                    <option value="FLAT">&#8377; Flat</option>
                  </select>
                  <div style="position:relative;">
                    <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#6b7280;font-size:13px;pointer-events:none;">
                      {{ tax.type === 'FLAT' ? '₹' : '%' }}
                    </span>
                    <input
                      type="number"
                      min="0"
                      [value]="tax.rate"
                      (input)="updateBillTaxField($index, 'rate', +$any($event.target).value)"
                      style="padding:8px 10px 8px 26px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;width:100%;box-sizing:border-box;">
                  </div>
                  <label style="display:flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap;font-size:12px;color:#374151;">
                    <input type="checkbox" [checked]="tax.enabled !== false" (change)="updateBillTaxField($index, 'enabled', $any($event.target).checked)" style="width:15px;height:15px;accent-color:#4f46e5;cursor:pointer;">
                    Active
                  </label>
                  <button (click)="removeBillTax($index)" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:18px;padding:0 4px;line-height:1;">&#x2715;</button>
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
      --shadow:     0 1px 3px rgba(0,0,0,.07), 0 4px 12px rgba(0,0,0,.04);
      font-family: 'Inter', system-ui, sans-serif;
    }
    * { margin:0; padding:0; box-sizing:border-box; }

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

  restaurantInfo = signal<any>(null);

  orders    = signal<any[]>([]);
  sales     = signal<any>(null);
  topItems  = signal<any[]>([]);
  peakHours = signal<any[]>([]);
  peakDays  = signal<any[]>([]);
  error     = signal<string | null>(null);
  activeOrdersCount = signal<number>(0);
  activeTab = signal<'orders'|'tables'|'menu'|'staff'|'favorites'|'outlets'>('orders');
  selectedPeriod = 'day';

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
  billTaxRows = signal<{ name: string; rate: number; type: 'PERCENTAGE' | 'FLAT'; enabled: boolean }[]>([]);
  savingBillTaxes = signal(false);

  // Waiter notification state
  pendingServiceOrders = signal<any[]>([]);
  showNotifications    = signal(false);

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

  // Customer profile modal
  customerProfile = signal<any | null>(null);

  private revenueChart: Chart | null = null;
  private itemsChart:   Chart | null = null;
  private hoursChart:   Chart | null = null;
  private daysChart:    Chart | null = null;
  private timer: any;

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
  }

  ngOnInit() {
    this.api.get<any>('/tenant/restaurant/profile').subscribe({
      next: ({ data }) => {
        this.restaurantInfo.set(data);
        if (Array.isArray(data.billTaxes)) {
          this.billTaxRows.set(data.billTaxes.map((t: any) => ({
            name: t.name,
            rate: t.rate,
            type: t.type || 'PERCENTAGE',
            enabled: t.enabled !== false
          })));
        }
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
    // Waiter notification: kitchen marked order DONE
    this.sock.on<any>('order:ready_to_serve').subscribe(notification => {
      this.pendingServiceOrders.update(list => [notification, ...list]);
    });
    this.timer = setInterval(() => {
      this.loadOrders();
      if (this.isManager()) { this.loadSales(); this.loadItems(); this.loadTime(); }
    }, 30_000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
    [this.revenueChart, this.itemsChart, this.hoursChart, this.daysChart]
      .forEach(c => c?.destroy());
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

  // ── Bill-level tax methods ──────────────────────────────────
  addBillTax() {
    this.billTaxRows.update(rows => [...rows, { name: '', rate: 0, type: 'PERCENTAGE', enabled: true }]);
  }

  removeBillTax(i: number) {
    this.billTaxRows.update(rows => rows.filter((_, idx) => idx !== i));
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
  }

  markServed(notification: any) {
    this.api.patch(`/tenant/orders/${notification.orderId}/status`, { status: 'SERVED' }).subscribe({
      next: () => { this.dismissNotification(notification.orderId); this.loadOrders(); },
      error: e => console.error(e)
    });
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
