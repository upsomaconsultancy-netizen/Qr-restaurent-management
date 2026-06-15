import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth.service';

// Kitchen flow ends at DONE — waiter marks WAITING_FOR_SERVICE → SERVED
const KITCHEN_FLOW = ['PENDING', 'ACCEPTED', 'PREPARING', 'DONE'] as const;

const STATUS_CFG: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:             { bg: '#fef3c7', text: '#92400e', label: 'Pending'           },
  ACCEPTED:            { bg: '#dbeafe', text: '#1e40af', label: 'Accepted'          },
  PREPARING:           { bg: '#ede9fe', text: '#6b21a8', label: 'Preparing'         },
  DONE:                { bg: '#d1fae5', text: '#065f46', label: 'Done ✓'            },
  WAITING_FOR_SERVICE: { bg: '#fef9c3', text: '#713f12', label: 'Awaiting Service'  },
  SERVED:              { bg: '#f1f5f9', text: '#475569', label: 'Served'            },
  CANCELLED:           { bg: '#fee2e2', text: '#991b1b', label: 'Cancelled'         },
};

@Component({
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="kd-root">

      <!-- ── Header ── -->
      <header class="kd-header">
        <div class="kd-header-inner">
          <div class="kd-brand">
            <div class="kd-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12"/>
                <path d="M12 6v6l3 3"/>
                <path d="M2 2l4 4"/>
              </svg>
            </div>
            <div>
              <div class="kd-brand-name">Kitchen Display</div>
              <div class="kd-brand-sub">Real-time order management</div>
            </div>
          </div>

          <div class="kd-header-center">
            @if (orders().length) {
              <div class="kd-live-badge">
                <span class="kd-live-dot"></span>
                <span>{{ orders().length }} active order{{ orders().length !== 1 ? 's' : '' }}</span>
              </div>
            } @else {
              <div class="kd-live-badge kd-live-clear">
                <span class="kd-live-dot kd-dot-green"></span>
                <span>All clear</span>
              </div>
            }
          </div>

          <div class="kd-header-right">
            <!-- Status filter tabs -->
            <div class="kd-filter-tabs">
              @for (f of filterOptions; track f.key) {
                <button class="kd-filter-tab" [class.active]="activeFilter() === f.key" (click)="activeFilter.set(f.key)">
                  {{ f.label }}
                  @if (countByStatus(f.key); as n) {
                    <span class="kd-filter-count">{{ n }}</span>
                  }
                </button>
              }
            </div>
            <button class="kd-logout-btn" (click)="auth.logout()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- ── Board ── -->
      <div class="kd-board">
        @for (order of filteredOrders(); track order._id) {
          <div class="kd-card" [class.kd-card-urgent]="order.status === 'PENDING'" [class.kd-card-ready]="order.status === 'DONE'">

            <!-- Card header -->
            <div class="kd-card-head">
              <div class="kd-order-id">
                <span class="kd-order-num">#{{ order.orderNumber }}</span>
                <div class="kd-table-info">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18M9 21V9"/>
                  </svg>
                  Table {{ order.tableId?.number }}{{ order.tableId?.name ? ' · ' + order.tableId.name : '' }}
                </div>
              </div>
              <div class="kd-status-pill" [style.background]="statusBg(order.status)" [style.color]="statusText(order.status)">
                {{ statusLabel(order.status) }}
              </div>
            </div>

            <!-- Customer -->
            <div class="kd-customer-row">
              <div class="kd-cust-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="kd-cust-name">
                {{ order.customerSessionId?.customerName || order.customerName || 'Walk-in' }}
              </div>
              @if (order.customerSessionId?.mobileNumber || order.customerPhone) {
                <div class="kd-cust-phone">
                  {{ order.customerSessionId?.mobileNumber || order.customerPhone }}
                </div>
              }
            </div>

            <!-- Time + item count -->
            <div class="kd-meta-row">
              <span class="kd-time-badge">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {{ order.createdAt | date:'hh:mm a' }}
              </span>
              <span class="kd-items-count">{{ order.items.length }} item{{ order.items.length !== 1 ? 's' : '' }}</span>
            </div>

            <!-- Items preview -->
            <div class="kd-items-list">
              @for (item of order.items.slice(0, 4); track item._id) {
                <div class="kd-item" [class.kd-item-cancelled]="item.status === 'CANCELLED'">
                  <span class="kd-item-qty">{{ item.qty }}×</span>
                  <span class="kd-item-name">{{ item.name }}</span>
                  @if (item.variant?.name) { <span class="kd-item-var">{{ item.variant.name }}</span> }
                  <span class="kd-item-dot" [style.background]="statusBg(item.status)" [style.color]="statusText(item.status)">
                    {{ item.status === 'PENDING' ? '·' : (item.status === 'DONE' ? '✓' : item.status[0]) }}
                  </span>
                </div>
              }
              @if (order.items.length > 4) {
                <div class="kd-more-items">+ {{ order.items.length - 4 }} more items</div>
              }
            </div>

            <!-- Actions -->
            <div class="kd-card-foot">
              <button class="kd-view-btn" (click)="viewOrder(order)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                View Details
              </button>
              @if (isAwaitingService(order.status)) {
                <div class="kd-awaiting-badge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Awaiting Waiter
                </div>
              } @else {
                @if (next(order.status); as nxt) {
                  <button class="kd-advance-btn" [class.kd-btn-done]="nxt === 'DONE'" (click)="advance(order, nxt)">
                    Mark {{ nxt === 'DONE' ? 'Done' : nxt }}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                }
              }
            </div>
          </div>
        } @empty {
          <div class="kd-empty">
            <div class="kd-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3 class="kd-empty-title">All Clear!</h3>
            <p class="kd-empty-sub">No active orders in this view. New orders appear here instantly.</p>
          </div>
        }
      </div>
    </div>

    <!-- ═══ Order Detail Modal ═══ -->
    @if (selectedOrder()) {
      <div class="kd-overlay" (click)="closeModal()">
        <div class="kd-modal" (click)="$event.stopPropagation()">
          <div class="kd-modal-head">
            <div>
              <div class="kd-modal-title">
                Order #{{ selectedOrder()!.orderNumber }}
                <span class="kd-status-pill kd-status-pill-sm"
                  [style.background]="statusBg(selectedOrder()!.status)"
                  [style.color]="statusText(selectedOrder()!.status)">
                  {{ statusLabel(selectedOrder()!.status) }}
                </span>
              </div>
              <div class="kd-modal-sub">
                Table {{ selectedOrder()!.tableId?.number }}
                @if (selectedOrder()!.tableId?.name) { · {{ selectedOrder()!.tableId.name }} }
                · {{ selectedOrder()!.customerSessionId?.customerName || selectedOrder()!.customerName || 'Walk-in' }}
                @if (selectedOrder()!.customerSessionId?.mobileNumber || selectedOrder()!.customerPhone) {
                  · {{ selectedOrder()!.customerSessionId?.mobileNumber || selectedOrder()!.customerPhone }}
                }
              </div>
            </div>
            <button class="kd-modal-close" (click)="closeModal()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="kd-modal-body">
            <table class="kd-items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="kd-r">Qty</th>
                  <th class="kd-r">Total</th>
                  <th class="kd-r">Status</th>
                </tr>
              </thead>
              <tbody>
                @for (item of selectedOrder()!.items; track item._id) {
                  <tr [class.kd-row-cancelled]="item.status === 'CANCELLED'">
                    <td>
                      <div class="kd-td-name">{{ item.name }}</div>
                      @if (item.variant?.name) { <div class="kd-td-meta">{{ item.variant.name }}</div> }
                      @if (item.addons?.length) {
                        <div class="kd-td-meta">+ {{ addonNames(item) }}</div>
                      }
                      @if (item.notes) {
                        <div class="kd-td-note">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          {{ item.notes }}
                        </div>
                      }
                    </td>
                    <td class="kd-r">{{ item.qty }}</td>
                    <td class="kd-r">₹{{ item.lineTotal }}</td>
                    <td class="kd-r">
                      <span class="kd-status-pill kd-status-pill-sm"
                        [style.background]="statusBg(item.status)"
                        [style.color]="statusText(item.status)">
                        {{ statusLabel(item.status) }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr class="kd-total-row">
                  <td colspan="2">Total</td>
                  <td class="kd-r">₹{{ selectedOrder()!.total }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="kd-modal-foot">
            <button class="kd-modal-close-btn" (click)="closeModal()">Close</button>
            @if (isAwaitingService(selectedOrder()!.status)) {
              <div class="kd-awaiting-badge kd-awaiting-badge-lg">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                Awaiting Waiter Service
              </div>
            } @else {
              @if (next(selectedOrder()!.status); as nxt) {
                <button class="kd-advance-btn" [class.kd-btn-done]="nxt === 'DONE'" (click)="advanceFromModal(nxt)">
                  Mark Order {{ nxt === 'DONE' ? 'Done' : nxt }}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              }
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      --bg: #0f172a;
      --card: #1e293b;
      --card-hover: #243044;
      --border: #334155;
      --border-soft: #2a3a50;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --accent: #f97316;
      --accent-green: #10b981;
      --radius: 12px;
      --radius-sm: 8px;
      display: block; min-height: 100vh; background: var(--bg);
      font-family: 'Inter', system-ui, sans-serif;
      color: var(--text); font-size: 14px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Header ── */
    .kd-header {
      background: #0a1628;
      border-bottom: 1px solid var(--border);
      position: sticky; top: 0; z-index: 100;
    }
    .kd-header-inner {
      display: flex; align-items: center; gap: 1rem;
      padding: .75rem 1.25rem; max-width: 1600px; margin: 0 auto;
    }
    .kd-brand { display: flex; align-items: center; gap: .625rem; flex-shrink: 0; }
    .kd-brand-icon {
      width: 36px; height: 36px; border-radius: 9px;
      background: linear-gradient(135deg, #f97316, #ef4444);
      display: flex; align-items: center; justify-content: center; color: #fff;
    }
    .kd-brand-name { font-size: .9rem; font-weight: 700; color: var(--text); }
    .kd-brand-sub { font-size: .68rem; color: var(--muted); }

    .kd-header-center { flex: 1; display: flex; justify-content: center; }
    .kd-live-badge {
      display: inline-flex; align-items: center; gap: .5rem;
      padding: .35rem .875rem; background: rgba(239,68,68,.12);
      border: 1px solid rgba(239,68,68,.25); border-radius: 20px;
      font-size: .78rem; font-weight: 600; color: #fca5a5;
    }
    .kd-live-clear { background: rgba(16,185,129,.1); border-color: rgba(16,185,129,.2); color: #6ee7b7; }
    .kd-live-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #ef4444; animation: blink 1.2s ease-in-out infinite;
    }
    .kd-dot-green { background: #10b981; animation: none; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }

    .kd-header-right { display: flex; align-items: center; gap: .625rem; flex-shrink: 0; }
    .kd-filter-tabs { display: flex; gap: .25rem; }
    .kd-filter-tab {
      display: inline-flex; align-items: center; gap: .35rem;
      padding: .3rem .65rem; border-radius: var(--radius-sm);
      border: 1px solid var(--border); background: transparent;
      color: var(--muted); font-size: .72rem; font-weight: 600; cursor: pointer;
      transition: all .15s;
    }
    .kd-filter-tab.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    .kd-filter-tab:hover:not(.active) { border-color: var(--muted); color: var(--text); }
    .kd-filter-count {
      background: rgba(255,255,255,.2); padding: .05rem .35rem;
      border-radius: 10px; font-size: .65rem;
    }
    .kd-logout-btn {
      width: 32px; height: 32px; border: 1px solid var(--border);
      border-radius: var(--radius-sm); background: transparent; color: var(--muted);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all .15s;
    }
    .kd-logout-btn:hover { border-color: var(--muted); color: var(--text); }

    /* ── Board ── */
    .kd-root { min-height: 100vh; }
    .kd-board {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem; padding: 1.25rem;
      max-width: 1600px; margin: 0 auto;
    }

    /* ── Card ── */
    .kd-card {
      background: var(--card); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 1rem;
      display: flex; flex-direction: column; gap: .75rem;
      transition: box-shadow .15s;
    }
    .kd-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.3); }
    .kd-card-urgent {
      border-color: #f59e0b;
      box-shadow: 0 0 0 1px rgba(245,158,11,.2), 0 0 16px rgba(245,158,11,.08);
    }
    .kd-card-ready {
      border-color: #10b981;
      box-shadow: 0 0 0 1px rgba(16,185,129,.2), 0 0 16px rgba(16,185,129,.08);
    }

    /* Card sections */
    .kd-card-head {
      display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem;
    }
    .kd-order-num { font-size: 1.05rem; font-weight: 800; color: var(--text); }
    .kd-table-info {
      display: flex; align-items: center; gap: .3rem;
      font-size: .72rem; color: var(--muted); margin-top: .15rem;
    }

    .kd-customer-row {
      display: flex; align-items: center; gap: .5rem;
      background: rgba(255,255,255,.04); border-radius: var(--radius-sm);
      padding: .5rem .75rem;
    }
    .kd-cust-icon { color: var(--muted); flex-shrink: 0; }
    .kd-cust-name { font-size: .82rem; font-weight: 600; color: var(--text); flex: 1; }
    .kd-cust-phone { font-size: .72rem; color: var(--muted); }

    .kd-meta-row { display: flex; align-items: center; justify-content: space-between; }
    .kd-time-badge {
      display: flex; align-items: center; gap: .3rem;
      font-size: .72rem; color: var(--muted);
    }
    .kd-items-count { font-size: .72rem; color: var(--muted); }

    .kd-items-list { display: flex; flex-direction: column; gap: .3rem; }
    .kd-item {
      display: flex; align-items: center; gap: .4rem;
      font-size: .78rem; padding: .2rem 0;
    }
    .kd-item-cancelled { opacity: .4; text-decoration: line-through; }
    .kd-item-qty { color: var(--accent); font-weight: 700; min-width: 1.5rem; flex-shrink: 0; }
    .kd-item-name { flex: 1; color: var(--text); }
    .kd-item-var { font-size: .68rem; color: var(--muted); }
    .kd-item-dot {
      width: 18px; height: 18px; border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      font-size: .6rem; font-weight: 800; flex-shrink: 0;
    }
    .kd-more-items { font-size: .72rem; color: var(--muted); padding-left: 1.9rem; }

    /* Card footer */
    .kd-card-foot {
      display: flex; gap: .5rem; margin-top: auto; padding-top: .25rem;
    }
    .kd-view-btn {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: .35rem;
      padding: .5rem .75rem; background: transparent;
      border: 1px solid var(--border); color: var(--muted);
      border-radius: var(--radius-sm); font-size: .75rem; cursor: pointer; transition: all .15s;
    }
    .kd-view-btn:hover { border-color: var(--muted); color: var(--text); }
    .kd-advance-btn {
      flex: 2; display: flex; align-items: center; justify-content: center; gap: .35rem;
      padding: .5rem .75rem; background: var(--accent); color: #fff;
      border: none; border-radius: var(--radius-sm);
      font-size: .78rem; font-weight: 700; cursor: pointer; transition: background .15s;
    }
    .kd-advance-btn:hover { background: #ea6c00; }
    .kd-btn-done { background: var(--accent-green); }
    .kd-btn-done:hover { background: #059669; }
    .kd-awaiting-badge {
      flex: 2; display: flex; align-items: center; justify-content: center; gap: .35rem;
      padding: .5rem .75rem; background: rgba(234,179,8,.12);
      border: 1px solid rgba(234,179,8,.3); color: #fbbf24;
      border-radius: var(--radius-sm); font-size: .75rem; font-weight: 700;
    }
    .kd-awaiting-badge-lg { flex: 3; font-size: .82rem; }

    /* Empty state */
    .kd-empty {
      grid-column: 1 / -1; text-align: center;
      padding: 5rem 1rem; color: var(--muted);
    }
    .kd-empty-icon { color: var(--accent-green); opacity: .6; margin-bottom: 1.25rem; }
    .kd-empty-title { font-size: 1.25rem; font-weight: 700; color: var(--text); margin-bottom: .5rem; }
    .kd-empty-sub { font-size: .875rem; max-width: 320px; margin: 0 auto; }

    /* Status pill */
    .kd-status-pill {
      display: inline-block; padding: .25rem .65rem;
      border-radius: 20px; font-size: .68rem; font-weight: 700;
      white-space: nowrap; flex-shrink: 0;
    }
    .kd-status-pill-sm { font-size: .65rem; padding: .18rem .5rem; }

    /* ── Modal ── */
    .kd-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 300;
      display: flex; align-items: center; justify-content: center; padding: 1rem;
    }
    .kd-modal {
      background: #1e293b; border: 1px solid var(--border);
      border-radius: var(--radius); width: 100%; max-width: 560px;
      max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;
    }
    .kd-modal-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); gap: .75rem;
    }
    .kd-modal-title {
      display: flex; align-items: center; gap: .5rem;
      font-size: 1rem; font-weight: 800; color: var(--text);
    }
    .kd-modal-sub { font-size: .75rem; color: var(--muted); margin-top: .25rem; }
    .kd-modal-close {
      width: 28px; height: 28px; border: 1px solid var(--border);
      border-radius: 6px; background: transparent; color: var(--muted);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all .15s;
    }
    .kd-modal-close:hover { border-color: var(--muted); color: var(--text); }

    .kd-modal-body { flex: 1; overflow-y: auto; padding: 1rem 1.25rem; }
    .kd-items-table { width: 100%; border-collapse: collapse; font-size: .82rem; color: var(--text); }
    .kd-items-table th {
      border-bottom: 1px solid var(--border); padding: .5rem .5rem .5rem 0;
      color: var(--muted); font-size: .7rem; text-transform: uppercase;
      letter-spacing: .04em; font-weight: 600;
    }
    .kd-items-table td { padding: .625rem .5rem .625rem 0; border-bottom: 1px solid rgba(255,255,255,.05); vertical-align: top; }
    .kd-r { text-align: right; }
    .kd-td-name { font-weight: 600; }
    .kd-td-meta { font-size: .7rem; color: var(--muted); margin-top: .15rem; }
    .kd-td-note {
      display: flex; align-items: center; gap: .25rem;
      font-size: .7rem; color: #fbbf24; margin-top: .2rem;
    }
    .kd-row-cancelled { opacity: .4; }
    .kd-total-row td { font-weight: 700; padding-top: .75rem; border-top: 1px solid var(--border); border-bottom: none; }

    .kd-modal-foot {
      display: flex; gap: .75rem; padding: .875rem 1.25rem;
      border-top: 1px solid var(--border);
    }
    .kd-modal-close-btn {
      flex: 1; padding: .55rem;
      background: transparent; border: 1px solid var(--border);
      color: var(--muted); border-radius: var(--radius-sm);
      font-size: .82rem; cursor: pointer; transition: all .15s;
    }
    .kd-modal-close-btn:hover { border-color: var(--muted); color: var(--text); }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .kd-board { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); padding: .875rem; gap: .75rem; }
      .kd-header-inner { flex-wrap: wrap; gap: .5rem; }
      .kd-header-center { order: 3; width: 100%; justify-content: flex-start; }
      .kd-filter-tabs { flex-wrap: wrap; }
      .kd-brand-sub { display: none; }
    }
    @media (max-width: 480px) {
      .kd-board { grid-template-columns: 1fr; }
      .kd-filter-tab span:not(.kd-filter-count) { display: none; }
    }
  `]
})
export class KitchenComponent implements OnInit {
  private api    = inject(ApiService);
  private socket = inject(SocketService);
  auth           = inject(AuthService);

  orders        = signal<any[]>([]);
  selectedOrder = signal<any>(null);
  activeFilter  = signal<string>('ALL');

  filterOptions = [
    { key: 'ALL',       label: 'All'       },
    { key: 'PENDING',   label: 'Pending'   },
    { key: 'ACCEPTED',  label: 'Accepted'  },
    { key: 'PREPARING', label: 'Preparing' },
    { key: 'DONE',      label: 'Done'      },
  ];

  ngOnInit() {
    this.load();
    this.socket.joinStaffRoom();
    this.socket.on<any>('order:new').subscribe(() => this.load());
    this.socket.on<any>('order:updated').subscribe(() => this.load());
  }

  load() {
    this.api.get<any[]>('/tenant/orders/kitchen-queue').subscribe(({ data }) => this.orders.set(data));
  }

  filteredOrders(): any[] {
    const f = this.activeFilter();
    return f === 'ALL' ? this.orders() : this.orders().filter(o => o.status === f);
  }

  countByStatus(key: string): number {
    if (key === 'ALL') return 0;
    return this.orders().filter(o => o.status === key).length;
  }

  // Kitchen can only advance up to DONE; DONE and beyond are handled by waiters
  next(status: string): string | null {
    const i = KITCHEN_FLOW.indexOf(status as any);
    return i >= 0 && i < KITCHEN_FLOW.length - 1 ? KITCHEN_FLOW[i + 1] : null;
  }

  isAwaitingService(status: string): boolean {
    return status === 'DONE' || status === 'WAITING_FOR_SERVICE';
  }

  advance(order: any, status: string) {
    this.api.patch(`/tenant/orders/${order._id}/status`, { status }).subscribe(() => this.load());
  }

  viewOrder(order: any)  { this.selectedOrder.set(order); }
  closeModal()           { this.selectedOrder.set(null); }

  advanceFromModal(status: string) {
    const o = this.selectedOrder();
    if (!o) return;
    this.api.patch(`/tenant/orders/${o._id}/status`, { status }).subscribe(() => {
      this.load();
      this.closeModal();
    });
  }

  addonNames(item: any): string {
    return (item.addons || []).slice(0, 3).map((a: any) => a.name).join(', ');
  }

  statusBg(s: string):    string { return STATUS_CFG[s]?.bg    ?? '#f1f5f9'; }
  statusText(s: string):  string { return STATUS_CFG[s]?.text  ?? '#475569'; }
  statusLabel(s: string): string { return STATUS_CFG[s]?.label ?? s; }
}
