import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth.service';

const FLOW = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'] as const;


@Component({
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="kd-wrap">
      <header class="kd-header">
        <div class="kd-header-inner">
          <div class="kd-title">
            <span class="kd-icon">🍳</span>
            Kitchen Display
            @if (orders().length) {
              <span class="kd-count">{{ orders().length }}</span>
            }
          </div>
          <button class="kd-signout" (click)="auth.logout()">Sign Out</button>
        </div>
      </header>

      <div class="kd-board">
        @for (order of orders(); track order._id) {
          <div class="kd-card" [class.kd-card-urgent]="order.status === 'PENDING'">

            <!-- Card Header -->
            <div class="kd-card-header">
              <div class="kd-card-id">
                <span class="kd-order-num">#{{ order.orderNumber }}</span>
                <span class="kd-table-badge">
                  🪑 Table {{ order.tableId?.number }}
                  @if (order.tableId?.name) { · {{ order.tableId.name }} }
                </span>
              </div>
              <span class="kd-status-badge" [style.background]="statusBg(order.status)" [style.color]="statusColor(order.status)">
                {{ order.status }}
              </span>
            </div>

            <!-- Customer Info -->
            <div class="kd-customer">
              <span class="kd-cust-name">
                👤 {{ order.customerSessionId?.customerName || order.customerName || '—' }}
              </span>
              @if (order.customerSessionId?.mobileNumber || order.customerPhone) {
                <span class="kd-cust-phone">
                  📞 {{ order.customerSessionId?.mobileNumber || order.customerPhone }}
                </span>
              }
            </div>

            <div class="kd-time">{{ order.createdAt | date:'hh:mm a' }}</div>

            <!-- Items preview (first 3) -->
            <div class="kd-items-preview">
              @for (item of order.items.slice(0, 3); track item._id) {
                <div class="kd-item-row">
                  <span class="kd-item-qty">{{ item.qty }}×</span>
                  <span class="kd-item-name">{{ item.name }}</span>
                  @if (item.notes) { <span class="kd-item-note">{{ item.notes }}</span> }
                  <span class="kd-item-status" [style.color]="statusColor(item.status)">{{ item.status }}</span>
                </div>
              }
              @if (order.items.length > 3) {
                <div class="kd-more">+{{ order.items.length - 3 }} more items</div>
              }
            </div>

            <!-- Actions -->
            <div class="kd-actions">
              <button class="kd-view-btn" (click)="viewItems(order)">
                👁 View All Items
              </button>
              @if (next(order.status); as nxt) {
                <button class="kd-advance-btn" (click)="advance(order, nxt)">
                  Mark {{ nxt }} →
                </button>
              }
            </div>
          </div>
        } @empty {
          <div class="kd-empty">
            <div class="kd-empty-icon">✅</div>
            <h3>All Clear!</h3>
            <p>No active orders. New orders appear here instantly.</p>
          </div>
        }
      </div>
    </div>

    <!-- Items Detail Modal -->
    @if (selectedOrder()) {
      <div class="kd-overlay" (click)="closeModal()">
        <div class="kd-modal" (click)="$event.stopPropagation()">
          <div class="kd-modal-header">
            <div>
              <div class="kd-modal-title">Order #{{ selectedOrder()!.orderNumber }}</div>
              <div class="kd-modal-sub">
                Table {{ selectedOrder()!.tableId?.number }} ·
                {{ selectedOrder()!.customerSessionId?.customerName || selectedOrder()!.customerName || 'Customer' }} ·
                {{ selectedOrder()!.customerSessionId?.mobileNumber || selectedOrder()!.customerPhone || '' }}
              </div>
            </div>
            <button class="kd-modal-close" (click)="closeModal()">✕</button>
          </div>
          <div class="kd-modal-body">
            <table class="kd-items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="kd-num">Qty</th>
                  <th class="kd-num">Price</th>
                  <th class="kd-num">Status</th>
                </tr>
              </thead>
              <tbody>
                @for (item of selectedOrder()!.items; track item._id) {
                  <tr [class.kd-cancelled]="item.status === 'CANCELLED'">
                    <td>
                      <div class="kd-td-name">{{ item.name }}</div>
                      @if (item.variant?.name) { <div class="kd-td-var">{{ item.variant.name }}</div> }
                      @if (item.addons?.length) {
                        <div class="kd-td-var">+ {{ addonNames(item) }}</div>
                      }
                      @if (item.notes) { <div class="kd-td-note">📝 {{ item.notes }}</div> }
                      <div class="kd-td-time">{{ selectedOrder()!.createdAt | date:'hh:mm a' }}</div>
                    </td>
                    <td class="kd-num">{{ item.qty }}</td>
                    <td class="kd-num">₹{{ item.lineTotal }}</td>
                    <td class="kd-num">
                      <span class="kd-item-badge" [style.background]="statusBg(item.status)" [style.color]="statusColor(item.status)">
                        {{ item.status }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="kd-modal-footer">
            @if (next(selectedOrder()!.status); as nxt) {
              <button class="kd-advance-btn" (click)="advanceFromModal(nxt)">
                Mark Order {{ nxt }} →
              </button>
            }
            <button class="kd-close-btn" (click)="closeModal()">Close</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      --bg: #0f172a; --card: #1e293b; --border: #334155;
      --text: #f1f5f9; --muted: #94a3b8; --accent: #f97316;
      --radius: 12px; --radius-sm: 8px;
      display: block; min-height: 100vh; background: var(--bg);
      font-family: 'Inter', system-ui, sans-serif;
    }
    * { margin:0; padding:0; box-sizing:border-box; }

    .kd-wrap { min-height:100vh; }

    .kd-header { background:#0f172a; border-bottom:1px solid var(--border); position:sticky; top:0; z-index:50; }
    .kd-header-inner { display:flex; align-items:center; justify-content:space-between; padding:.875rem 1.25rem; max-width:1400px; margin:0 auto; }
    .kd-title { display:flex; align-items:center; gap:.625rem; font-size:1.1rem; font-weight:700; color:var(--text); }
    .kd-icon { font-size:1.25rem; }
    .kd-count { background:var(--accent); color:white; font-size:.72rem; font-weight:800; padding:.2rem .55rem; border-radius:2rem; }
    .kd-signout { background:transparent; border:1px solid var(--border); color:var(--muted); padding:.4rem .875rem; border-radius:var(--radius-sm); font-size:.8rem; cursor:pointer; transition:all .18s; }
    .kd-signout:hover { border-color:var(--muted); color:var(--text); }

    .kd-board { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:1rem; padding:1.25rem; max-width:1400px; margin:0 auto; }

    .kd-card { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:1rem; display:flex; flex-direction:column; gap:.75rem; }
    .kd-card-urgent { border-color:#f59e0b; box-shadow:0 0 0 1px #f59e0b22; }

    .kd-card-header { display:flex; align-items:flex-start; justify-content:space-between; gap:.5rem; }
    .kd-card-id { display:flex; flex-direction:column; gap:.2rem; }
    .kd-order-num { font-size:1rem; font-weight:800; color:var(--text); }
    .kd-table-badge { font-size:.75rem; color:var(--muted); }
    .kd-status-badge { font-size:.68rem; font-weight:700; padding:.25rem .6rem; border-radius:.25rem; white-space:nowrap; }

    .kd-customer { display:flex; flex-direction:column; gap:.2rem; background:rgba(255,255,255,.04); border-radius:var(--radius-sm); padding:.5rem .75rem; }
    .kd-cust-name { font-size:.82rem; font-weight:600; color:var(--text); }
    .kd-cust-phone { font-size:.75rem; color:var(--muted); }

    .kd-time { font-size:.72rem; color:var(--muted); }

    .kd-items-preview { display:flex; flex-direction:column; gap:.3rem; }
    .kd-item-row { display:flex; align-items:center; gap:.5rem; font-size:.8rem; }
    .kd-item-qty { color:var(--accent); font-weight:700; min-width:1.5rem; }
    .kd-item-name { flex:1; color:var(--text); }
    .kd-item-note { font-size:.7rem; color:var(--muted); font-style:italic; }
    .kd-item-status { font-size:.68rem; font-weight:600; }
    .kd-more { font-size:.72rem; color:var(--muted); }

    .kd-actions { display:flex; gap:.5rem; flex-wrap:wrap; margin-top:auto; }
    .kd-view-btn { flex:1; padding:.5rem .75rem; background:transparent; border:1px solid var(--border); color:var(--muted); border-radius:var(--radius-sm); font-size:.78rem; cursor:pointer; transition:all .18s; white-space:nowrap; }
    .kd-view-btn:hover { border-color:var(--muted); color:var(--text); }
    .kd-advance-btn { flex:2; padding:.5rem .75rem; background:var(--accent); color:white; border:none; border-radius:var(--radius-sm); font-size:.78rem; font-weight:700; cursor:pointer; transition:background .18s; white-space:nowrap; }
    .kd-advance-btn:hover { background:#ea6c00; }

    .kd-empty { grid-column:1/-1; text-align:center; padding:4rem 1rem; color:var(--muted); }
    .kd-empty-icon { font-size:3rem; margin-bottom:1rem; }
    .kd-empty h3 { font-size:1.25rem; color:var(--text); margin-bottom:.5rem; }
    .kd-empty p { font-size:.875rem; }

    /* Modal */
    .kd-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:200; display:flex; align-items:center; justify-content:center; padding:1rem; }
    .kd-modal { background:#1e293b; border:1px solid var(--border); border-radius:var(--radius); width:100%; max-width:520px; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; }
    .kd-modal-header { display:flex; align-items:flex-start; justify-content:space-between; padding:1rem 1.25rem; border-bottom:1px solid var(--border); }
    .kd-modal-title { font-size:1rem; font-weight:800; color:var(--text); }
    .kd-modal-sub { font-size:.78rem; color:var(--muted); margin-top:.2rem; }
    .kd-modal-close { background:transparent; border:none; color:var(--muted); font-size:1.1rem; cursor:pointer; padding:.25rem; }
    .kd-modal-body { flex:1; overflow-y:auto; padding:1rem 1.25rem; }
    .kd-items-table { width:100%; border-collapse:collapse; font-size:.82rem; color:var(--text); }
    .kd-items-table th { border-bottom:1px solid var(--border); padding:.5rem .25rem; color:var(--muted); font-weight:600; text-align:left; font-size:.75rem; text-transform:uppercase; letter-spacing:.04em; }
    .kd-items-table td { padding:.625rem .25rem; border-bottom:1px solid rgba(255,255,255,.05); vertical-align:top; }
    .kd-num { text-align:right; }
    .kd-td-name { font-weight:600; }
    .kd-td-var { font-size:.72rem; color:var(--muted); margin-top:.15rem; }
    .kd-td-note { font-size:.72rem; color:#fbbf24; margin-top:.15rem; }
    .kd-td-time { font-size:.68rem; color:var(--muted); margin-top:.2rem; }
    .kd-item-badge { font-size:.65rem; font-weight:700; padding:.2rem .45rem; border-radius:.2rem; }
    .kd-cancelled { opacity:.45; }
    .kd-modal-footer { display:flex; gap:.75rem; padding:1rem 1.25rem; border-top:1px solid var(--border); }
    .kd-close-btn { flex:1; padding:.625rem; background:transparent; border:1px solid var(--border); color:var(--muted); border-radius:var(--radius-sm); font-size:.85rem; cursor:pointer; }
  `]
})
export class KitchenComponent implements OnInit {
  private api    = inject(ApiService);
  private socket = inject(SocketService);
  auth           = inject(AuthService);

  orders        = signal<any[]>([]);
  selectedOrder = signal<any>(null);

  ngOnInit() {
    this.load();
    this.socket.joinStaffRoom();
    this.socket.on<any>('order:new').subscribe(() => this.load());
    this.socket.on<any>('order:updated').subscribe(() => this.load());
  }

  load() {
    this.api.get<any[]>('/orders/kitchen-queue').subscribe(({ data }) => this.orders.set(data));
  }

  next(status: string): string | null {
    const i = FLOW.indexOf(status as any);
    return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null;
  }

  advance(order: any, status: string) {
    this.api.patch(`/orders/${order._id}/status`, { status }).subscribe(() => this.load());
  }

  viewItems(order: any) { this.selectedOrder.set(order); }
  closeModal()          { this.selectedOrder.set(null); }

  advanceFromModal(status: string) {
    const o = this.selectedOrder();
    if (!o) return;
    this.api.patch(`/orders/${o._id}/status`, { status }).subscribe(() => {
      this.load();
      this.closeModal();
    });
  }

  addonNames(item: any): string {
    return (item.addons || []).slice(0, 3).map((a: any) => a.name).join(', ');
  }

  statusBg(s: string): string {
    const map: Record<string, string> = {
      PENDING: '#fef3c7', ACCEPTED: '#dbeafe', PREPARING: '#ede9fe',
      READY: '#d1fae5', SERVED: '#f1f5f9', CANCELLED: '#fee2e2'
    };
    return map[s] ?? '#f1f5f9';
  }

  statusColor(s: string): string {
    const map: Record<string, string> = {
      PENDING: '#92400e', ACCEPTED: '#1e40af', PREPARING: '#6b21a8',
      READY: '#065f46', SERVED: '#475569', CANCELLED: '#991b1b'
    };
    return map[s] ?? '#475569';
  }
}
