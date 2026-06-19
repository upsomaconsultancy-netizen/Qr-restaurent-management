import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  signal,
  PLATFORM_ID,
} from "@angular/core";
import { isPlatformBrowser, CommonModule, DecimalPipe } from "@angular/common";
import { FormsModule, ReactiveFormsModule, FormControl } from "@angular/forms";
import { Subject } from "rxjs";
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  takeUntil,
} from "rxjs/operators";
import { of } from "rxjs";
import { ApiService } from "../../core/services/api.service";
import { SocketService } from "../../core/services/socket.service";

interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  foodType: string;
  spicyLevel: number;
  categoryId: string;
  variants: { _id: string; name: string; price: number }[];
  taxes?: { name: string; rate: number }[];
}
interface CartLine {
  item: MenuItem;
  qty: number;
}

const CUSTOMER_TOKEN_PREFIX = "ros_cust_token_";
const PAST_ORDERS_PREFIX = "ros_cust_past_";

@Component({
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule, ReactiveFormsModule],
  template: `
    @if (discountBanner()) {
      <div class="cm-discount-toast">{{ discountBanner() }}</div>
    }
    @if (loading()) {
    } @else if (tableFull()) {
      <div class="cm-page cm-error-page">
        <div class="cm-error-box cm-table-full-box">
          <div class="cm-table-full-icon">
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
              <path d="M12 8v4m0 4h.01" stroke-linecap="round" />
            </svg>
          </div>
          <h2 class="cm-error-title cm-table-full-title">
            Table Capacity Reached
          </h2>
          <p class="cm-error-desc">
            This table is currently full ({{ tableFull()!.seatsOccupied }}/{{
              tableFull()!.capacity
            }}
            seats occupied).
          </p>
          <p class="cm-error-desc cm-table-full-hint">
            Please take another available seat and scan its QR code, or ask a
            waiter for help.
          </p>
          <div class="cm-table-full-capacity">
            @for (i of capacityArr(tableFull()!.capacity); track i) {
              <div
                class="cm-seat-dot"
                [class.cm-seat-taken]="i <= tableFull()!.seatsOccupied"
              ></div>
            }
          </div>
        </div>
      </div>
    } @else if (!data()) {
      <div class="cm-page cm-error-page">
        @if (
          fetchError()?.code === "FORBIDDEN" ||
          fetchError()?.message?.toLowerCase()?.includes("outlet") ||
          fetchError()?.message?.toLowerCase()?.includes("unavailable")
        ) {
          <div class="cm-error-box cm-outlet-closed-box">
            <div class="cm-outlet-closed-icon">🔒</div>
            <h2 class="cm-error-title">Outlet Temporarily Closed</h2>
            <p class="cm-error-desc">
              This outlet is currently unavailable or has been deactivated.
            </p>
            <p class="cm-error-desc cm-error-hint">
              Please contact staff or visit us at another time.
            </p>
          </div>
        } @else {
          <div class="cm-error-box">
            <div class="cm-error-icon">⚠️</div>
            <h2 class="cm-error-title">QR Code Invalid</h2>
            <p class="cm-error-desc">
              This QR code is invalid or expired. Please ask staff for
              assistance.
            </p>
          </div>
        }
      </div>
    } @else if (!orderType()) {
      <div class="cm-page">
        <header class="cm-header">
          <div class="cm-header-inner">
            <div class="cm-resto-info">
              @if (data()!.restaurant.logoUrl) {
                <img
                  class="cm-logo"
                  [src]="data()!.restaurant.logoUrl"
                  [alt]="data()!.restaurant.name"
                />
              } @else {
                <div class="cm-resto-avatar">
                  {{ data()!.restaurant.name.charAt(0) }}
                </div>
              }
              <div>
                <div class="cm-resto-name">{{ data()!.restaurant.name }}</div>
                <div class="cm-table-badge">
                  Table {{ data()!.table.number }}
                </div>
              </div>
            </div>
          </div>
        </header>
        <div class="cm-body cm-choose-body">
          <div class="cm-choose-card">
            <div class="cm-choose-icon">🍽️</div>
            <h2 class="cm-choose-title">How would you like to order?</h2>
            <p class="cm-choose-sub">Choose your dining preference</p>
            <div class="cm-choose-options">
              <button
                class="cm-opt-btn cm-opt-primary"
                (click)="orderType.set('DINING')"
              >
                <span class="cm-opt-emoji">🍽️</span>
                <div>
                  <div class="cm-opt-label">Dine In</div>
                  <div class="cm-opt-desc">Eat at the table</div>
                </div>
              </button>
              <button
                class="cm-opt-btn cm-opt-secondary"
                (click)="orderType.set('TAKEAWAY')"
              >
                <span class="cm-opt-emoji">📦</span>
                <div>
                  <div class="cm-opt-label">Takeaway</div>
                  <div class="cm-opt-desc">Carry your food</div>
                </div>
              </button>
            </div>
            <div class="cm-delivery-soon">⏱ Home delivery — coming soon</div>
          </div>
        </div>
      </div>
    } @else {
      <div class="cm-page">
        <header class="cm-header">
          <div class="cm-header-inner">
            <div class="cm-resto-info">
              @if (data()!.restaurant.logoUrl) {
                <img
                  class="cm-logo"
                  [src]="data()!.restaurant.logoUrl"
                  [alt]="data()!.restaurant.name"
                />
              } @else {
                <div class="cm-resto-avatar">
                  {{ data()!.restaurant.name.charAt(0) }}
                </div>
              }
              <div>
                <div class="cm-resto-name">{{ data()!.restaurant.name }}</div>
                <div class="cm-table-badge">
                  Table {{ data()!.table.number }}
                  @if (custName) {
                    · {{ custName }}
                  }
                </div>
              </div>
            </div>
            <div class="cm-header-actions">
              @if (data()!.restaurant.website) {
                <a
                  class="cm-website-link"
                  [href]="data()!.restaurant.website"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🌐 Visit Website
                </a>
              }
              <div class="cm-order-type-chip">
                {{ orderType() === "DINING" ? "🍽️ Dine In" : "📦 Takeaway" }}
              </div>
            </div>
          </div>
        </header>

        <!-- Search Bar -->
        <div class="cm-search-wrap">
          <div class="cm-search-inner">
            <svg
              class="cm-search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              class="cm-search-input"
              type="search"
              placeholder="Search menu items…"
              [formControl]="searchControl"
              autocomplete="off"
            />
            @if (searchControl.value) {
              <button
                class="cm-search-clear"
                (click)="clearSearch()"
                aria-label="Clear search"
              >
                ✕
              </button>
            }
          </div>
        </div>

        <!-- Category Pills — hidden during active search -->
        @if (!searchQuery()) {
          <div class="cm-cats-wrap">
            <div class="cm-cats">
              <button
                class="cm-cat-pill"
                [class.active]="activeCat() === ''"
                (click)="selectCat('')"
              >
                All
              </button>
              @for (c of data()!.categories; track c._id) {
                <button
                  class="cm-cat-pill"
                  [class.active]="activeCat() === c._id"
                  (click)="selectCat(c._id)"
                >
                  {{ c.name }}
                </button>
              }
            </div>
          </div>
        }

        <div class="cm-body">
          @if (searchQuery()) {
            <div class="cm-items-count">
              {{ searchResults().length }} result{{
                searchResults().length !== 1 ? "s" : ""
              }}
              for "{{ searchQuery() }}"
            </div>
          } @else {
            <div class="cm-items-count">
              {{ visibleItems().length }} item{{
                visibleItems().length !== 1 ? "s" : ""
              }}
            </div>
          }

          @for (item of pagedItems(); track item._id) {
            <div class="cm-item-card">
              <div class="cm-item-body">
                <div class="cm-item-veg-dot">
                  @if (item.foodType === "NON_VEG") {
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <rect width="10" height="10" rx="2" fill="#c0392b" />
                      <polygon points="5,2 9,8 1,8" fill="white" />
                    </svg>
                  } @else {
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <rect width="10" height="10" rx="2" fill="#27ae60" />
                      <circle cx="5" cy="5" r="3" fill="white" />
                    </svg>
                  }
                </div>
                <div class="cm-item-text">
                  <div class="cm-item-name">{{ item.name }}</div>
                  @if (item.description) {
                    <div class="cm-item-desc">{{ item.description }}</div>
                  }
                  <div class="cm-item-meta">
                    @if (item.spicyLevel) {
                      <span class="cm-spicy">{{
                        "🌶️".repeat(Math.min(item.spicyLevel, 3))
                      }}</span>
                    }
                    @if (item.taxes?.length) {
                      <span class="cm-tax-note">+ taxes</span>
                    }
                  </div>
                  <div class="cm-item-price">₹{{ item.price }}</div>
                </div>
                <div class="cm-item-actions">
                  @if (item.imageUrl) {
                    <img
                      class="cm-item-img"
                      [src]="item.imageUrl"
                      [alt]="item.name"
                      loading="lazy"
                    />
                  } @else {
                    <div class="cm-item-img-ph">🍴</div>
                  }
                  @if (getQty(item) === 0) {
                    <button class="cm-add-btn" (click)="add(item)">ADD</button>
                  } @else {
                    <div class="cm-qty-ctrl">
                      <button class="cm-qty-btn" (click)="remove(item)">
                        −
                      </button>
                      <span class="cm-qty-num">{{ getQty(item) }}</span>
                      <button class="cm-qty-btn" (click)="add(item)">+</button>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          @if (activeItems().length === 0) {
            <div class="cm-empty-cat">
              @if (searchQuery()) {
                <p>No items found for "{{ searchQuery() }}"</p>
              } @else {
                <p>No items in this category</p>
              }
            </div>
          }

          @if (totalPages() > 1) {
            <div class="cm-pagination">
              <button
                class="cm-page-nav"
                [disabled]="currentPage() === 1"
                (click)="goToPage(currentPage() - 1)"
              >
                ‹ Prev
              </button>
              @for (p of pageNumbers(); track p) {
                <button
                  class="cm-page-num"
                  [class.active]="currentPage() === p"
                  (click)="goToPage(p)"
                >
                  {{ p }}
                </button>
              }
              <button
                class="cm-page-nav"
                [disabled]="currentPage() === totalPages()"
                (click)="goToPage(currentPage() + 1)"
              >
                Next ›
              </button>
            </div>
          }

          <!-- Bill Section -->
          @if (bill(); as b) {
            @if (b.orders?.length) {
              <div class="cm-bill-card">
                <div class="cm-bill-head">
                  🧾 Your Orders
                  @if (b.paid) {
                    <span class="cm-paid-chip">✓ Paid</span>
                  }
                </div>
                @for (o of b.orders; track o._id) {
                  <div class="cm-bill-order">
                    <div class="cm-bill-order-head">
                      <span>Order #{{ o.orderNumber }}</span>
                      <span
                        class="cm-status-dot"
                        [attr.data-s]="o.status.toLowerCase()"
                        >{{ o.status }}</span
                      >
                    </div>
                    @for (li of o.items; track li._id) {
                      <div class="cm-bill-line">
                        <span class="cm-bill-item">
                          {{ li.qty }} × {{ li.name }}
                          @if (li.locked) {
                            <span class="cm-served-tag">🔒 Served</span>
                          }
                        </span>
                        <span class="cm-bill-amt">₹{{ li.lineTotal }}</span>
                      </div>
                    }
                  </div>
                }
                <div class="cm-bill-totals">
                  <div class="cm-bill-row">
                    <span>Subtotal</span><span>₹{{ b.subtotal }}</span>
                  </div>
                  @if (hasTaxes(b)) {
                    @for (t of b.taxes; track t.name) {
                      @if ((t.amount || 0) > 0) {
                        <div class="cm-bill-row cm-bill-tax">
                          <span>{{ t.name }}</span
                          ><span>₹{{ t.amount }}</span>
                        </div>
                      }
                    }
                  }
                  @if (b.billTaxes?.length) {
                    @for (t of b.billTaxes; track t.name) {
                      @if ((t.amount || 0) > 0) {
                        <div class="cm-bill-row cm-bill-tax">
                          <span>{{ t.name }}</span
                          ><span>₹{{ t.amount }}</span>
                        </div>
                      }
                    }
                  }
                  @if (b.discountAmount > 0) {
                    <div class="cm-bill-row cm-bill-discount">
                      <span>🎉 Discount{{ b.discounts?.[0]?.name ? ' (' + b.discounts[0].name + ')' : '' }}</span>
                      <span>− ₹{{ b.discountAmount }}</span>
                    </div>
                  }
                  <div class="cm-bill-row cm-bill-grand">
                    <span>Total</span><span>₹{{ b.total }}</span>
                  </div>
                  @if (b.dueAmount > 0 && !b.paid) {
                    <div class="cm-bill-row cm-bill-due">
                      <span>Due</span><span>₹{{ b.dueAmount }}</span>
                    </div>
                  }
                </div>

                @if (b.tip) {
                  <div class="cm-tip-added">
                    💚 You added a ₹{{ b.tip.amount }} tip@if (b.tip.waiterName) { for {{ b.tip.waiterName }}} — thank you!
                  </div>
                }

                @if (b.paid) {
                  <div class="cm-paid-banner">
                    🎉 Bill cleared — Thank you for dining with us!
                  </div>
                }

                <!-- Payment + Tip -->
                @if (b.canPay && !b.paid) {
                  <div class="cm-payment-section">
                    <div class="cm-pay-row">
                      <button
                        class="cm-pay-btn"
                        (click)="showPaymentComingSoon = true"
                      >
                        💳 Proceed to Payment
                      </button>
                      @if (!b.tip) {
                        <button class="cm-tip-btn" (click)="openTip()">
                          💝 Give Tip
                        </button>
                      }
                    </div>
                  </div>
                }

                <!-- Receipt Button — only after payment is done -->
                @if (b.paid && b.canGenerateReceipt) {
                  <button class="cm-receipt-btn" (click)="viewReceipt()">
                    🖨️ View / Print Receipt
                  </button>
                } @else if (b.orders?.length && !b.paid) {
                  <div class="cm-receipt-disabled">
                    Receipt available after payment is completed
                  </div>
                }
              </div>
            }
          }

          <!-- Previous Visits -->
          @if (pastOrders().length) {
            <div class="cm-history-card">
              <div class="cm-history-head">
                <span class="cm-history-ico">🧾</span>
                <span>Your Previous Orders</span>
                <span class="cm-history-count">{{ pastOrders().length }}</span>
              </div>
              @for (visit of pastOrders(); track $index) {
                <div class="cm-history-row">
                  <div class="cm-history-main">
                    <div class="cm-history-items">{{ visit.items.join(", ") }}</div>
                    <div class="cm-history-date">
                      {{ visit.date | date: "dd MMM yyyy, hh:mm a" }}
                    </div>
                  </div>
                  <div class="cm-history-total">₹{{ visit.total }}</div>
                </div>
              }
            </div>
          }

          <div style="height:100px"></div>
        </div>

        <!-- Cart Footer -->
        @if (cart().length) {
          <div class="cm-cart-footer">
            <button
              class="cm-cart-btn"
              (click)="requestPlaceOrder()"
              [disabled]="placing()"
            >
              @if (placing()) {
                <span>Placing order…</span>
              } @else {
                <div class="cm-cart-left">
                  <span class="cm-cart-badge">{{ cartCount() }}</span>
                  <span>Place Order</span>
                </div>
                <span class="cm-cart-total"
                  >₹{{ cartTotal() | number: "1.0-0" }}</span
                >
              }
            </button>
          </div>
        }
      </div>
    }

    <!-- ── Identity Popup Modal ── -->
    @if (showIdentityModal()) {
      <div class="cm-modal-overlay" (click)="showIdentityModal.set(false)">
        <div
          class="cm-modal cm-identity-modal"
          (click)="$event.stopPropagation()"
        >
          <div class="cm-modal-icon" style="padding:2px;">
            <img
              class="cm-logo"
              style="height:60px;width:60px"
              [src]="data()!.restaurant.logoUrl"
              [alt]="data()!.restaurant.name"
            />
          </div>
          <h3 class="cm-modal-title">Almost there!</h3>
          <p class="cm-modal-body">
            Enter your details so we can track your order.🍔
          </p>
          <div class="cm-form-group">
            <label class="cm-label">👨‍💼 Your Name *</label>
            <input
              class="cm-input"
              type="text"
              [(ngModel)]="custName"
              placeholder="e.g. Rahul Sharma"
              maxlength="50"
              [class.cm-input-error]="identityError() && !custName.trim()"
            />
          </div>
          <div class="cm-form-group">
            <label class="cm-label">☎️ Mobile Number *</label>
            <input
              class="cm-input"
              type="tel"
              [(ngModel)]="custMobile"
              placeholder="10-digit mobile number"
              maxlength="10"
              [class.cm-input-error]="identityError() && !isMobileValid()"
            />
          </div>
          @if (identityError()) {
            <div class="cm-input-msg cm-input-msg-err">
              {{ identityError() }}
            </div>
          }
          <button
            class="cm-submit-btn"
            (click)="submitIdentity()"
            [disabled]="submittingIdentity()"
          >
            @if (submittingIdentity()) {
              Placing order…
            } @else {
              Confirm & Place Order
            }
          </button>
          <button
            class="cm-modal-cancel"
            (click)="showIdentityModal.set(false)"
          >
            Cancel
          </button>
        </div>
      </div>
    }

    <!-- ── Payment Coming Soon Modal ── -->
    @if (showPaymentComingSoon) {
      <div class="cm-modal-overlay" (click)="showPaymentComingSoon = false">
        <div class="cm-modal" (click)="$event.stopPropagation()">
          <div class="cm-modal-icon">💳</div>
          <h3 class="cm-modal-title">Payment Gateway</h3>
          <p class="cm-modal-body">
            Online payment is coming soon!<br />Please pay at the counter or ask
            your waiter.
          </p>
          <button
            class="cm-modal-close"
            (click)="showPaymentComingSoon = false"
          >
            Got it
          </button>
        </div>
      </div>
    }

    <!-- ── Give Tip Modal ── -->
    @if (showTipModal()) {
      <div class="cm-modal-overlay" (click)="closeTip()">
        <div class="cm-modal" (click)="$event.stopPropagation()">
          <div class="cm-modal-icon">💝</div>
          <h3 class="cm-modal-title">Give a Tip</h3>
          <p class="cm-modal-body">
            Show your appreciation to the staff who served you. Tips are not part
            of your bill.
          </p>
          <div class="cm-tip-chips">
            @for (a of tipPresets; track a) {
              <button
                type="button"
                class="cm-tip-chip"
                [class.active]="tipAmount === a"
                (click)="tipAmount = a"
              >
                ₹{{ a }}
              </button>
            }
          </div>
          <div class="cm-form-group">
            <label class="cm-label">💰 Tip Amount *</label>
            <input
              class="cm-input"
              type="number"
              min="1"
              [(ngModel)]="tipAmount"
              placeholder="Enter amount"
            />
          </div>
          @if (tipError()) {
            <div class="cm-input-msg cm-input-msg-err">{{ tipError() }}</div>
          }
          <button
            class="cm-submit-btn"
            (click)="submitTip()"
            [disabled]="submittingTip()"
          >
            @if (submittingTip()) {
              Adding…
            } @else {
              Add
            }
          </button>
          <button class="cm-modal-cancel" (click)="closeTip()">Cancel</button>
        </div>
      </div>
    }

    <!-- ── Receipt Modal ── -->
    @if (receipt()) {
      <div class="cm-modal-overlay" (click)="closeReceipt()">
        <div class="cm-receipt-modal" (click)="$event.stopPropagation()">
          <div class="cm-receipt-content" id="receipt-print-area">
            <div class="rcpt">
              <!-- Restaurant Header -->
              @if (receipt()!.restaurant.logoUrl) {
                <img
                  class="rcpt-logo"
                  [src]="receipt()!.restaurant.logoUrl"
                  [alt]="receipt()!.restaurant.name"
                />
              }
              <div class="rcpt-name">{{ receipt()!.restaurant.name }}</div>
              <div class="rcpt-addr">{{ receipt()!.restaurant.address }}</div>
              <div class="rcpt-addr">📞 {{ receipt()!.restaurant.phone }}</div>
              @if (receipt()!.restaurant.gstin) {
                <div class="rcpt-addr">
                  GSTIN: {{ receipt()!.restaurant.gstin }}
                </div>
              }
              @if (receipt()!.restaurant.email) {
                <div class="rcpt-addr">{{ receipt()!.restaurant.email }}</div>
              }
              @if (receipt()!.restaurant.website) {
                <div class="rcpt-addr">{{ receipt()!.restaurant.website }}</div>
              }

              <div class="rcpt-divider">
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              </div>
              <div class="rcpt-invoice-title">
                TAX INVOICE / CUSTOMER RECEIPT
              </div>
              <div class="rcpt-divider">
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              </div>

              <!-- Order Details -->
              <div class="rcpt-details">
                <div class="rcpt-detail-row">
                  <span>Order ID</span
                  ><span>{{ receipt()!.order.orderId }}</span>
                </div>
                <div class="rcpt-detail-row">
                  <span>Table</span
                  ><span>{{
                    receipt()!.order.tableName || receipt()!.order.tableNumber
                  }}</span>
                </div>
                <div class="rcpt-detail-row">
                  <span>Customer</span
                  ><span>{{ receipt()!.order.customerName }}</span>
                </div>
                <div class="rcpt-detail-row">
                  <span>Mobile</span
                  ><span>{{ receipt()!.order.customerMobile }}</span>
                </div>
                <div class="rcpt-detail-row">
                  <span>Date</span
                  ><span>{{
                    receipt()!.order.orderDate | date: "dd MMM yyyy, hh:mm a"
                  }}</span>
                </div>
                <div class="rcpt-detail-row">
                  <span>Generated</span
                  ><span>{{
                    receipt()!.order.generatedAt | date: "dd MMM yyyy, hh:mm a"
                  }}</span>
                </div>
              </div>

              <div class="rcpt-divider">
                ───────────────────────────────────
              </div>

              <!-- Items Table -->
              <table class="rcpt-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th class="rcpt-num">Qty</th>
                    <th class="rcpt-num">Rate</th>
                    <th class="rcpt-num">Amt</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of receipt()!.items; track $index) {
                    <tr>
                      <td>
                        {{ item.name }}
                        @if (item.variant) {
                          <span class="rcpt-variant">
                            ({{ item.variant }})</span
                          >
                        }
                      </td>
                      <td class="rcpt-num">{{ item.qty }}</td>
                      <td class="rcpt-num">
                        {{ item.unitPrice | number: "1.2-2" }}
                      </td>
                      <td class="rcpt-num">
                        {{ item.lineTotal | number: "1.2-2" }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>

              <div class="rcpt-divider">
                ───────────────────────────────────
              </div>

              <!-- Totals -->
              <div class="rcpt-totals">
                <div class="rcpt-total-row">
                  <span>Subtotal</span
                  ><span
                    >&#8377;{{
                      receipt()!.summary.subtotal | number: "1.2-2"
                    }}</span
                  >
                </div>
                @for (t of receipt()!.summary.taxes; track t.name) {
                  @if ((t.amount || 0) > 0) {
                    <div class="rcpt-total-row rcpt-tax-row">
                      <span>{{ t.name }}</span
                      ><span>&#8377;{{ t.amount | number: "1.2-2" }}</span>
                    </div>
                  }
                }
                @if (receipt()!.summary.billTaxes?.length) {
                  @for (t of receipt()!.summary.billTaxes; track t.name) {
                    @if ((t.amount || 0) > 0) {
                      <div class="rcpt-total-row rcpt-tax-row">
                        <span>{{ t.name }}</span
                        ><span>&#8377;{{ t.amount | number: "1.2-2" }}</span>
                      </div>
                    }
                  }
                }
                @if (receipt()!.summary.discountAmount > 0) {
                  <div class="rcpt-total-row rcpt-discount-row">
                    <span
                      >Discount{{ receipt()!.summary.discounts?.[0]?.name ? ' (' + receipt()!.summary.discounts[0].name + ')' : '' }}</span
                    >
                    <span
                      >&#8722;&#8377;{{
                        receipt()!.summary.discountAmount | number: "1.2-2"
                      }}</span
                    >
                  </div>
                }
                @if (receipt()!.summary.serviceCharge) {
                  <div class="rcpt-total-row rcpt-tax-row">
                    <span
                      >Service Charge ({{
                        receipt()!.summary.serviceChargePercent
                      }}%)</span
                    >
                    <span
                      >&#8377;{{
                        receipt()!.summary.serviceCharge | number: "1.2-2"
                      }}</span
                    >
                  </div>
                }
                <div class="rcpt-divider">
                  &#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;
                </div>
                <div class="rcpt-total-row rcpt-grand-total">
                  <span>GRAND TOTAL</span
                  ><span
                    >&#8377;{{
                      receipt()!.summary.grandTotal | number: "1.2-2"
                    }}</span
                  >
                </div>
              </div>

              <div class="rcpt-divider">
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              </div>
              <div class="rcpt-footer">Thank You For Visiting!</div>
              <div class="rcpt-footer rcpt-footer-sub">Visit Again Soon 😊</div>
              @if (receipt()!.restaurant.website) {
                <div class="rcpt-footer rcpt-footer-web">
                  {{ receipt()!.restaurant.website }}
                </div>
              }
            </div>
          </div>
          <div class="cm-receipt-actions-wrap">
            @if (receipt()!.restaurant.googleReviewLink) {
              <a
                class="cm-rate-btn"
                [href]="receipt()!.restaurant.googleReviewLink"
                target="_blank"
                rel="noopener noreferrer"
              >
                ⭐ Rate Our Restaurant
              </a>
            }
            <div class="cm-receipt-actions">
              <button class="cm-print-btn-modal" (click)="printReceipt()">
                🖨️ Print
              </button>
              <button class="cm-close-btn" (click)="closeReceipt()">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        --primary: #e8542f;
        --primary-light: #fdeae3;
        --primary-dark: #c94120;
        --text: #111827;
        --text-muted: #6b7280;
        --border: #ececf0;
        --surface: #ffffff;
        --bg: #f4f5f7;
        --radius: 14px;
        --radius-sm: 10px;
        --shadow-sm: 0 1px 3px rgba(17, 24, 39, 0.06);
        --shadow-md: 0 6px 20px rgba(17, 24, 39, 0.07);
        --shadow-primary: 0 6px 18px rgba(232, 84, 47, 0.35);
        font-family: "Inter", system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      .cm-page {
        min-height: 100dvh;
        background:
          radial-gradient(1200px 320px at 50% -120px, #fdeae3 0%, transparent 70%),
          var(--bg);
        max-width: 600px;
        margin: 0 auto;
      }
      .cm-header {
        background: rgba(255, 255, 255, 0.82);
        backdrop-filter: saturate(180%) blur(14px);
        -webkit-backdrop-filter: saturate(180%) blur(14px);
        border-bottom: 1px solid var(--border);
        position: sticky;
        top: 0;
        z-index: 50;
        box-shadow: var(--shadow-sm);
      }
      .cm-header-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.8rem 1rem;
      }
      .cm-resto-info {
        display: flex;
        align-items: center;
        gap: 0.7rem;
      }
      .cm-logo {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1.5px var(--primary-light), var(--shadow-sm);
      }
      .cm-resto-avatar {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.05rem;
        font-weight: 800;
        flex-shrink: 0;
        box-shadow: var(--shadow-primary);
      }
      .cm-resto-name {
        font-size: 1rem;
        font-weight: 800;
        letter-spacing: -0.01em;
        color: var(--text);
      }
      .cm-table-badge {
        display: inline-flex;
        align-items: center;
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--primary-dark);
        background: var(--primary-light);
        padding: 0.12rem 0.5rem;
        border-radius: 999px;
        margin-top: 0.2rem;
      }
      .cm-order-type-chip {
        font-size: 0.75rem;
        font-weight: 700;
        background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        color: #fff;
        padding: 0.35rem 0.8rem;
        border-radius: 999px;
        box-shadow: var(--shadow-primary);
      }
      .cm-header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .cm-website-link {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-muted);
        text-decoration: none;
        padding: 0.3rem 0.6rem;
        border: 1px solid var(--border);
        border-radius: 2rem;
        white-space: nowrap;
      }
      .cm-website-link:hover {
        color: var(--primary);
        border-color: var(--primary);
      }

      .cm-body {
        padding: 0 0 1rem;
      }
      .cm-choose-body {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 85dvh;
      }

      /* Identity Form */
      .cm-identity-card {
        background: var(--surface);
        border-radius: 20px;
        padding: 2rem 1.5rem;
        margin: 1rem;
        border: 1px solid var(--border);
        box-shadow: var(--shadow-md);
        text-align: center;
      }
      .cm-identity-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
      }
      .cm-form-group {
        text-align: left;
        margin-bottom: 1rem;
      }
      .cm-label {
        display: block;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text);
        margin-bottom: 0.35rem;
      }
      .cm-input {
        width: 100%;
        padding: 0.7rem 0.875rem;
        border: 1.5px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.9rem;
        color: var(--text);
        outline: none;
        transition: border-color 0.18s;
      }
      .cm-input:focus {
        border-color: var(--primary);
      }
      .cm-input-error {
        border-color: #dc2626 !important;
      }
      .cm-input-msg {
        font-size: 0.78rem;
        margin-top: 0.35rem;
        text-align: left;
      }
      .cm-input-msg-err {
        color: #dc2626;
      }
      .cm-submit-btn {
        width: 100%;
        padding: 0.9rem;
        background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 0.95rem;
        font-weight: 700;
        cursor: pointer;
        margin-top: 0.5rem;
        box-shadow: var(--shadow-primary);
        transition: all 0.18s;
      }
      .cm-submit-btn:hover {
        filter: brightness(1.05);
      }
      .cm-submit-btn:active {
        transform: scale(0.99);
      }
      .cm-submit-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      /* Order type */
      .cm-choose-card {
        background: var(--surface);
        border-radius: 20px;
        padding: 2.25rem 1.5rem;
        margin: 1rem;
        border: 1px solid var(--border);
        box-shadow: var(--shadow-md);
        text-align: center;
      }
      .cm-choose-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
      }
      .cm-choose-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 0.4rem;
      }
      .cm-choose-sub {
        font-size: 0.875rem;
        color: var(--text-muted);
        margin-bottom: 1.75rem;
      }
      .cm-choose-options {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .cm-opt-btn {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        padding: 1.05rem 1.25rem;
        border-radius: 14px;
        border: 1.5px solid transparent;
        cursor: pointer;
        text-align: left;
        transition: all 0.18s;
        width: 100%;
      }
      .cm-opt-btn:active {
        transform: scale(0.985);
      }
      .cm-opt-primary {
        background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        color: white;
        box-shadow: var(--shadow-primary);
      }
      .cm-opt-secondary {
        background: var(--surface);
        color: var(--text);
        border-color: var(--border);
        box-shadow: var(--shadow-sm);
      }
      .cm-opt-secondary:hover {
        border-color: var(--primary);
      }
      .cm-opt-emoji {
        font-size: 1.5rem;
      }
      .cm-opt-label {
        font-size: 1rem;
        font-weight: 700;
      }
      .cm-opt-desc {
        font-size: 0.78rem;
        opacity: 0.8;
      }
      .cm-delivery-soon {
        margin-top: 1.25rem;
        font-size: 0.78rem;
        color: var(--text-muted);
      }

      /* Search Bar */
      .cm-search-wrap {
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        padding: 0.625rem 1rem;
        position: sticky;
        top: 68px;
        z-index: 41;
      }
      .cm-search-inner {
        position: relative;
        display: flex;
        align-items: center;
        background: var(--bg);
        border: 1.5px solid var(--border);
        border-radius: 999px;
        transition: all 0.18s;
      }
      .cm-search-inner:focus-within {
        border-color: var(--primary);
        background: #fff;
        box-shadow: 0 0 0 4px var(--primary-light);
      }
      .cm-search-icon {
        position: absolute;
        left: 0.7rem;
        color: var(--text-muted);
        flex-shrink: 0;
        pointer-events: none;
      }
      .cm-search-input {
        flex: 1;
        border: none;
        background: transparent;
        padding: 0.6rem 0.6rem 0.6rem 2.25rem;
        font-size: 0.875rem;
        color: var(--text);
        outline: none;
        min-width: 0;
      }
      .cm-search-input::placeholder {
        color: var(--text-muted);
      }
      .cm-search-input::-webkit-search-cancel-button {
        display: none;
      }
      .cm-search-clear {
        background: none;
        border: none;
        padding: 0.4rem 0.65rem;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 0.8rem;
        line-height: 1;
      }
      .cm-search-clear:hover {
        color: var(--text);
      }
      .cm-search-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid var(--border);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        margin-right: 0.65rem;
        flex-shrink: 0;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      @keyframes cmFadeUp {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Categories */
      .cm-cats-wrap {
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        position: sticky;
        top: 116px;
        z-index: 40;
      }
      .cm-cats {
        display: flex;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .cm-cats::-webkit-scrollbar {
        display: none;
      }
      .cm-cat-pill {
        padding: 0.4rem 0.9rem;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 2rem;
        font-size: 0.8rem;
        font-weight: 500;
        color: var(--text-muted);
        cursor: pointer;
        transition: all 0.18s;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .cm-cat-pill.active {
        background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        border-color: transparent;
        color: white;
        font-weight: 700;
        box-shadow: var(--shadow-primary);
      }
      .cm-items-count {
        font-size: 0.74rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: var(--text-muted);
        padding: 0.8rem 1rem 0.15rem;
      }

      /* Menu items */
      .cm-item-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 0.85rem 0.9rem;
        margin: 0.55rem 1rem;
        box-shadow: var(--shadow-sm);
        animation: cmFadeUp 0.3s ease both;
        transition:
          transform 0.16s ease,
          box-shadow 0.16s ease;
      }
      @media (prefers-reduced-motion: reduce) {
        .cm-item-card {
          animation: none;
        }
      }
      .cm-item-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }
      .cm-item-body {
        display: flex;
        align-items: flex-start;
        gap: 0.85rem;
      }
      .cm-item-veg-dot {
        flex-shrink: 0;
        margin-top: 2px;
      }
      .cm-item-text {
        flex: 1;
        min-width: 0;
      }
      .cm-item-name {
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: -0.01em;
        color: var(--text);
      }
      .cm-item-desc {
        font-size: 0.78rem;
        color: var(--text-muted);
        margin-top: 0.2rem;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .cm-item-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.3rem;
      }
      .cm-spicy {
        font-size: 0.82rem;
      }
      .cm-tax-note {
        font-size: 0.68rem;
        color: var(--text-muted);
        background: var(--bg);
        padding: 0.1rem 0.35rem;
        border-radius: 0.25rem;
      }
      .cm-item-price {
        font-size: 1.02rem;
        font-weight: 800;
        color: var(--primary-dark);
        margin-top: 0.35rem;
      }
      .cm-item-actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }
      .cm-item-img {
        width: 84px;
        height: 84px;
        object-fit: cover;
        border-radius: 14px;
        box-shadow: var(--shadow-sm);
      }
      .cm-item-img-ph {
        width: 84px;
        height: 84px;
        border-radius: 14px;
        background: linear-gradient(135deg, #fff6f2, var(--primary-light));
        border: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.7rem;
      }
      .cm-add-btn {
        margin-top: -16px;
        position: relative;
        padding: 0.45rem 1.4rem;
        background: var(--surface);
        border: 1.5px solid var(--primary);
        color: var(--primary);
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 800;
        letter-spacing: 0.03em;
        cursor: pointer;
        box-shadow: var(--shadow-sm);
        transition: all 0.16s;
      }
      .cm-add-btn:hover {
        background: var(--primary);
        color: white;
        box-shadow: var(--shadow-primary);
      }
      .cm-add-btn:active {
        transform: scale(0.95);
      }
      .cm-qty-ctrl {
        margin-top: -16px;
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        border-radius: 999px;
        overflow: hidden;
        box-shadow: var(--shadow-primary);
      }
      .cm-qty-btn {
        width: 30px;
        height: 30px;
        border: none;
        background: transparent;
        color: white;
        font-size: 1.15rem;
        font-weight: 700;
        cursor: pointer;
      }
      .cm-qty-btn:active {
        background: rgba(255, 255, 255, 0.18);
      }
      .cm-qty-num {
        min-width: 22px;
        text-align: center;
        font-size: 0.88rem;
        font-weight: 800;
        color: white;
      }
      .cm-empty-cat {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--text-muted);
      }

      .cm-pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        flex-wrap: wrap;
        padding: 1rem;
      }
      .cm-page-nav,
      .cm-page-num {
        min-width: 2.2rem;
        height: 2.2rem;
        padding: 0 0.5rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--surface);
        color: var(--text);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
      }
      .cm-page-num.active {
        background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        color: white;
        border-color: transparent;
        box-shadow: var(--shadow-primary);
      }
      .cm-page-nav:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* Bill Card */
      .cm-bill-card {
        background: var(--surface);
        margin: 1rem;
        border-radius: 16px;
        border: 1px solid var(--border);
        overflow: hidden;
        box-shadow: 0 4px 18px rgba(17, 24, 39, 0.06);
      }
      .cm-bill-head {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.875rem 1rem;
        background: linear-gradient(135deg, var(--primary-light), #fff6f2);
        border-bottom: 1px solid var(--border);
        font-size: 0.92rem;
        font-weight: 800;
        color: var(--primary-dark);
      }
      .cm-paid-chip {
        margin-left: auto;
        font-size: 0.72rem;
        font-weight: 700;
        background: #d1fae5;
        color: #065f46;
        padding: 0.2rem 0.6rem;
        border-radius: 2rem;
      }
      .cm-bill-order {
        border-bottom: 1px solid var(--border);
      }
      .cm-bill-order-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.625rem 1rem;
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--text-muted);
        background: #fafafa;
      }
      .cm-status-dot {
        font-size: 0.68rem;
        font-weight: 700;
        padding: 0.15rem 0.45rem;
        border-radius: 0.25rem;
      }
      .cm-status-dot[data-s="pending"] {
        background: #fef3c7;
        color: #92400e;
      }
      .cm-status-dot[data-s="accepted"] {
        background: #dbeafe;
        color: #1e40af;
      }
      .cm-status-dot[data-s="preparing"] {
        background: #dbeafe;
        color: #1e40af;
      }
      .cm-status-dot[data-s="ready"] {
        background: #d1fae5;
        color: #065f46;
      }
      .cm-status-dot[data-s="served"] {
        background: #f3e8ff;
        color: #6b21a8;
      }
      .cm-status-dot[data-s="completed"] {
        background: #e0e7ff;
        color: #3730a3;
      }
      .cm-bill-line {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        font-size: 0.82rem;
      }
      .cm-bill-item {
        color: var(--text);
        flex: 1;
      }
      .cm-served-tag {
        font-size: 0.68rem;
        color: #6b7280;
        margin-left: 0.35rem;
      }
      .cm-bill-amt {
        font-weight: 600;
        color: var(--text);
      }
      .cm-bill-totals {
        padding: 0.75rem 1rem;
        border-top: 1px solid var(--border);
      }
      .cm-bill-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        padding: 0.2rem 0;
        color: var(--text);
      }
      .cm-bill-tax {
        color: var(--text-muted);
        font-size: 0.8rem;
      }
      .cm-bill-grand {
        font-weight: 800;
        font-size: 1rem;
        padding-top: 0.5rem;
        border-top: 1px solid var(--border);
        margin-top: 0.35rem;
      }
      .cm-bill-due {
        color: #dc2626;
        font-weight: 700;
      }
      .cm-bill-discount {
        color: #059669;
        font-weight: 700;
      }
      .cm-discount-toast {
        position: fixed;
        top: 14px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 4000;
        background: linear-gradient(135deg, #10b981, #059669);
        color: #fff;
        font-weight: 700;
        font-size: 0.9rem;
        padding: 0.7rem 1.25rem;
        border-radius: 999px;
        box-shadow: 0 8px 24px rgba(5, 150, 105, 0.35);
        animation: cmDiscPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        max-width: 92vw;
        text-align: center;
      }
      @keyframes cmDiscPop {
        from { transform: translate(-50%, -16px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      .cm-paid-banner {
        background: linear-gradient(135deg, #d1fae5, #ecfdf5);
        color: #065f46;
        padding: 0.9rem 1rem;
        font-size: 0.86rem;
        font-weight: 700;
        text-align: center;
        border-top: 1px solid #a7f3d0;
      }

      /* Payment */
      .cm-payment-section {
        padding: 0.75rem 1rem;
        border-top: 1px solid var(--border);
      }
      .cm-pay-btn {
        width: 100%;
        padding: 0.9rem;
        background: linear-gradient(135deg, #16a34a, #15803d);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 0.92rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.18s;
        box-shadow: 0 4px 16px rgba(22, 163, 74, 0.35);
      }
      .cm-pay-btn:hover {
        filter: brightness(1.05);
      }
      .cm-pay-row {
        display: flex;
        gap: 0.5rem;
      }
      .cm-pay-row .cm-pay-btn {
        flex: 1;
      }
      .cm-tip-btn {
        flex: 0 0 auto;
        padding: 0.85rem 1rem;
        background: #fff;
        color: #be185d;
        border: 1.5px solid #fbcfe8;
        border-radius: var(--radius-sm);
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.18s;
      }
      .cm-tip-btn:hover {
        background: #fdf2f8;
      }
      .cm-tip-added {
        margin: 0.75rem 1rem 0;
        padding: 0.6rem 0.85rem;
        background: #ecfdf5;
        color: #047857;
        border: 1px solid #a7f3d0;
        border-radius: var(--radius-sm);
        font-size: 0.82rem;
        font-weight: 600;
        text-align: center;
      }
      .cm-tip-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        justify-content: center;
        margin-bottom: 0.85rem;
      }
      .cm-tip-chip {
        padding: 0.45rem 0.95rem;
        background: #fff;
        color: #be185d;
        border: 1.5px solid #fbcfe8;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
      }
      .cm-tip-chip.active {
        background: #be185d;
        color: #fff;
        border-color: #be185d;
      }

      /* Receipt */
      .cm-receipt-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.75rem;
        background: transparent;
        border: none;
        border-top: 1px solid var(--border);
        font-size: 0.82rem;
        color: var(--primary);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.18s;
      }
      .cm-receipt-btn:hover {
        background: var(--primary-light);
      }
      .cm-receipt-disabled {
        padding: 0.625rem 1rem;
        font-size: 0.75rem;
        color: var(--text-muted);
        text-align: center;
        border-top: 1px solid var(--border);
      }

      /* Previous Visits History */
      .cm-history-card {
        background: var(--surface);
        margin: 1rem;
        border-radius: 16px;
        border: 1px solid var(--border);
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(17, 24, 39, 0.05);
      }
      .cm-history-head {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.8rem 1rem;
        background: linear-gradient(135deg, var(--primary-light), #fff6f2);
        border-bottom: 1px solid var(--border);
        font-size: 0.85rem;
        font-weight: 800;
        color: var(--primary-dark);
      }
      .cm-history-ico {
        font-size: 1rem;
      }
      .cm-history-count {
        margin-left: auto;
        background: var(--primary);
        color: #fff;
        font-size: 0.72rem;
        font-weight: 700;
        min-width: 1.3rem;
        height: 1.3rem;
        padding: 0 0.4rem;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .cm-history-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.7rem 1rem;
        border-bottom: 1px solid var(--border);
        font-size: 0.82rem;
        transition: background 0.15s;
      }
      .cm-history-row:hover {
        background: var(--bg);
      }
      .cm-history-row:last-child {
        border-bottom: none;
      }
      .cm-history-main {
        flex: 1;
        min-width: 0;
      }
      .cm-history-date {
        color: var(--text-muted);
        font-size: 0.72rem;
        white-space: nowrap;
        margin-top: 0.15rem;
      }
      .cm-history-items {
        color: var(--text);
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .cm-history-total {
        font-weight: 800;
        color: var(--primary);
        white-space: nowrap;
        background: var(--primary-light);
        padding: 0.3rem 0.6rem;
        border-radius: 999px;
        font-size: 0.8rem;
      }

      /* Cart Footer */
      .cm-cart-footer {
        position: fixed;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 100%;
        max-width: 600px;
        padding: 0.875rem 1rem;
        pointer-events: none;
      }
      .cm-cart-btn {
        width: 100%;
        padding: 1rem 1.25rem;
        background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        color: white;
        border: none;
        border-radius: 14px;
        font-size: 0.95rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.18s;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 6px 22px rgba(232, 84, 47, 0.45);
        pointer-events: auto;
      }
      .cm-cart-btn:not(:disabled):active {
        transform: scale(0.985);
      }
      .cm-cart-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      .cm-cart-left {
        display: flex;
        align-items: center;
        gap: 0.625rem;
      }
      .cm-cart-badge {
        background: white;
        color: var(--primary);
        font-size: 0.78rem;
        font-weight: 800;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .cm-cart-total {
        font-size: 1rem;
        font-weight: 800;
      }

      /* Error Page */
      .cm-error-page {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .cm-error-box {
        text-align: center;
        padding: 2.5rem 1.5rem;
        margin: 2rem 1rem;
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
      }
      .cm-error-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }
      .cm-error-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 0.5rem;
      }
      .cm-error-desc {
        font-size: 0.875rem;
        color: var(--text-muted);
        line-height: 1.5;
      }
      .cm-table-full-box {
        border-color: rgba(239, 68, 68, 0.25);
        background: rgba(239, 68, 68, 0.04);
      }
      .cm-table-full-icon {
        color: #ef4444;
        margin-bottom: 1rem;
      }
      .cm-table-full-title {
        color: #ef4444;
      }
      .cm-table-full-hint {
        margin-top: 0.5rem;
      }
      .cm-outlet-closed-box {
        border-color: rgba(107, 114, 128, 0.25);
        background: rgba(107, 114, 128, 0.04);
      }
      .cm-outlet-closed-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }
      .cm-error-hint {
        margin-top: 0.5rem;
        font-size: 0.8rem;
      }
      .cm-table-full-capacity {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        margin-top: 1.25rem;
        flex-wrap: wrap;
      }
      .cm-seat-dot {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #e5e7eb;
        border: 2px solid #d1d5db;
      }
      .cm-seat-taken {
        background: #ef4444;
        border-color: #dc2626;
      }

      /* Loading skeleton */
      .sk {
        background: linear-gradient(
          90deg,
          #f0f0f0 25%,
          #e0e0e0 50%,
          #f0f0f0 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
        border-radius: 0.375rem;
      }
      .sk-title {
        height: 18px;
        width: 160px;
      }
      .sk-card {
        display: flex;
        gap: 0.875rem;
        padding: 0.875rem 1rem;
        border-bottom: 1px solid var(--border);
      }
      .sk-img {
        width: 72px;
        height: 72px;
        border-radius: var(--radius-sm);
        flex-shrink: 0;
      }
      .sk-lines {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        padding-top: 0.2rem;
      }
      .sk-line-lg {
        height: 14px;
        width: 70%;
      }
      .sk-line-md {
        height: 12px;
        width: 50%;
      }
      @keyframes shimmer {
        to {
          background-position: -200% 0;
        }
      }

      /* Modal */
      .cm-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(17, 24, 39, 0.55);
        backdrop-filter: blur(3px);
        -webkit-backdrop-filter: blur(3px);
        z-index: 200;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        animation: cmFadeUp 0.2s ease both;
      }
      .cm-modal {
        background: white;
        border-radius: 20px;
        padding: 2rem 1.5rem;
        max-width: 380px;
        width: 100%;
        text-align: center;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
        animation: cmFadeUp 0.25s ease both;
      }
      .cm-identity-modal {
        text-align: left;
      }
      .cm-identity-modal .cm-modal-icon {
        text-align: center;
        display: block;
      }
      .cm-identity-modal .cm-modal-title {
        text-align: center;
      }
      .cm-identity-modal .cm-modal-body {
        text-align: center;
      }
      .cm-modal-icon {
        font-size: 2.5rem;
        margin-bottom: 0.75rem;
      }
      .cm-modal-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 0.5rem;
      }
      .cm-modal-body {
        font-size: 0.875rem;
        color: var(--text-muted);
        line-height: 1.6;
        margin-bottom: 1.25rem;
      }
      .cm-modal-close {
        padding: 0.75rem 2rem;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: var(--radius-sm);
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
      }
      .cm-modal-cancel {
        display: block;
        width: 100%;
        padding: 0.65rem;
        background: transparent;
        border: 1px solid var(--border);
        color: var(--text-muted);
        border-radius: var(--radius-sm);
        font-size: 0.85rem;
        cursor: pointer;
        margin-top: 0.625rem;
      }

      /* Receipt Modal */
      .cm-receipt-modal {
        background: white;
        border-radius: var(--radius);
        max-width: 420px;
        width: 100%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .cm-receipt-content {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
      }
      .cm-receipt-actions-wrap {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        padding: 1rem;
        border-top: 1px solid var(--border);
      }
      .cm-receipt-actions {
        display: flex;
        gap: 0.75rem;
      }
      .cm-rate-btn {
        display: block;
        text-align: center;
        padding: 0.75rem;
        background: #fff7ed;
        color: #b45309;
        border: 1px solid #fcd34d;
        border-radius: var(--radius-sm);
        font-size: 0.9rem;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
      }
      .cm-print-btn-modal {
        flex: 1;
        padding: 0.75rem;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: var(--radius-sm);
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
      }
      .cm-close-btn {
        flex: 1;
        padding: 0.75rem;
        background: var(--bg);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
      }

      /* Receipt Content */
      .rcpt {
        font-family: "Courier New", monospace;
        font-size: 12px;
        color: #111;
        text-align: center;
        max-width: 320px;
        margin: 0 auto;
      }
      .rcpt-logo {
        width: 72px;
        height: 72px;
        object-fit: contain;
        margin-bottom: 0.5rem;
        border-radius: 8px;
      }
      .rcpt-name {
        font-size: 16px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
      }
      .rcpt-addr {
        font-size: 11px;
        color: #444;
        margin: 0.1rem 0;
      }
      .rcpt-divider {
        color: #666;
        margin: 0.5rem 0;
        font-size: 10px;
        overflow: hidden;
      }
      .rcpt-invoice-title {
        font-size: 12px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin: 0.25rem 0;
      }
      .rcpt-details {
        text-align: left;
        margin: 0.5rem 0;
      }
      .rcpt-detail-row {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        padding: 0.15rem 0;
      }
      .rcpt-detail-row span:first-child {
        color: #666;
      }
      .rcpt-detail-row span:last-child {
        font-weight: 600;
        text-align: right;
        flex: 1;
        margin-left: 0.5rem;
      }
      .rcpt-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        margin: 0.5rem 0;
      }
      .rcpt-table th {
        border-bottom: 1px dashed #999;
        padding: 0.25rem 0.1rem;
        font-weight: bold;
        text-align: left;
      }
      .rcpt-table td {
        padding: 0.2rem 0.1rem;
        vertical-align: top;
      }
      .rcpt-num {
        text-align: right;
      }
      .rcpt-variant {
        color: #666;
        font-size: 10px;
      }
      .rcpt-totals {
        text-align: left;
      }
      .rcpt-total-row {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        padding: 0.2rem 0;
      }
      .rcpt-tax-row {
        color: #555;
      }
      .rcpt-grand-total {
        font-size: 14px;
        font-weight: bold;
        padding: 0.5rem 0;
      }
      .rcpt-footer {
        font-size: 13px;
        font-weight: bold;
        margin: 0.3rem 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .rcpt-footer-sub {
        font-size: 11px;
        font-weight: normal;
        text-transform: none;
        color: #555;
      }
      .rcpt-footer-web {
        font-size: 10px;
        color: #777;
        font-weight: normal;
        text-transform: none;
        margin-top: 0.2rem;
      }

      @media print {
        :host {
          all: unset;
        }
        .cm-receipt-actions,
        .cm-modal-overlay > *:not(.cm-receipt-modal) {
          display: none;
        }
        .cm-receipt-modal {
          box-shadow: none;
          border: none;
          max-height: none;
        }
        .rcpt {
          margin: 0 auto;
        }
      }
    `,
  ],
})
export class CustomerMenuComponent implements OnInit, OnChanges, OnDestroy {
  @Input() qrToken!: string;

  protected readonly Math = Math;

  private api = inject(ApiService);
  private sock = inject(SocketService);
  private destroy = new Subject<void>();
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  loading = signal(true);
  data = signal<any>(null);
  fetchError = signal<{ message: string; code?: string } | null>(null);
  tableFull = signal<{ capacity: number; seatsOccupied: number } | null>(null);
  bill = signal<any>(null);
  receipt = signal<any>(null);
  cart = signal<CartLine[]>([]);
  orderType = signal<"DINING" | "TAKEAWAY" | null>(null);
  activeCat = signal<string>("");
  placing = signal(false);
  customerToken = signal<string | null>(null);
  identityError = signal<string>("");
  submittingIdentity = signal(false);
  showIdentityModal = signal(false);
  pastOrders = signal<any[]>([]);
  showPaymentComingSoon = false;

  // Tip
  showTipModal = signal(false);
  tipAmount: number | null = null;
  tipPresets = [20, 50, 100, 200];
  tipError = signal<string>("");
  submittingTip = signal(false);

  searchControl = new FormControl("");
  searchQuery = signal<string>("");
  searchResults = signal<MenuItem[]>([]);

  // Celebratory discount banner shown after placing an order that earned a discount.
  discountBanner = signal<string>("");
  private discountBannerTimer: any;

  custName = "";
  custMobile = "";

  isMobileValid() {
    return /^\d{10}$/.test(this.custMobile.trim());
  }
  capacityArr(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  hasTaxes(b: any): boolean {
    return (
      Array.isArray(b?.taxes) && b.taxes.some((t: any) => (t.amount || 0) > 0)
    );
  }

  visibleItems = computed(() =>
    (this.data()?.items ?? []).filter(
      (i: MenuItem) => !this.activeCat() || i.categoryId === this.activeCat(),
    ),
  );

  /** Items shown in the list — search results when query is active, filtered menu otherwise. */
  activeItems = computed(() =>
    this.searchQuery() ? this.searchResults() : this.visibleItems(),
  );

  static readonly PAGE_SIZE = 30;
  currentPage = signal(1);

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.activeItems().length / CustomerMenuComponent.PAGE_SIZE)),
  );

  /** Current page slice of activeItems() — keeps the list capped at PAGE_SIZE rows. */
  pagedItems = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * CustomerMenuComponent.PAGE_SIZE;
    return this.activeItems().slice(start, start + CustomerMenuComponent.PAGE_SIZE);
  });

  pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages()) return;
    this.currentPage.set(p);
  }

  selectCat(id: string) {
    this.activeCat.set(id);
    this.currentPage.set(1);
  }
  cartCount = computed(() => this.cart().reduce((s, l) => s + l.qty, 0));
  cartTotal = computed(() =>
    this.cart().reduce((s, l) => {
      const tax = (l.item.taxes || []).reduce(
        (t: number, x: any) => t + (x.rate || 0),
        0,
      );
      return s + l.qty * l.item.price * (1 + tax / 100);
    }, 0),
  );

  private tokenKey(): string {
    return CUSTOMER_TOKEN_PREFIX + this.qrToken;
  }

  private pastOrdersKey(): string {
    return PAST_ORDERS_PREFIX + this.qrToken;
  }

  /** Forget the current customer session so the browser is free for a fresh order. */
  private clearCustomerSession() {
    if (this.isBrowser) localStorage.removeItem(this.tokenKey());
    this.customerToken.set(null);
    this.bill.set(null);
  }

  /** Persist the "previous orders" list so it survives after the session is cleared. */
  private persistPastOrders(list: any[]) {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(this.pastOrdersKey(), JSON.stringify(list || []));
    } catch {}
  }

  private loadPersistedPastOrders() {
    if (!this.isBrowser) return;
    try {
      const raw = localStorage.getItem(this.pastOrdersKey());
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) this.pastOrders.set(arr);
    } catch {}
  }

  /** Build a compact "previous order" record from a completed bill. */
  private billToPastEntry(b: any) {
    const names = new Set<string>();
    for (const o of b?.orders || []) {
      for (const it of o.items || []) {
        if (it.status !== "CANCELLED") names.add(it.name);
      }
    }
    return {
      date: new Date().toISOString(),
      items: [...names].slice(0, 5),
      total: b?.total || 0,
    };
  }

  ngOnChanges(c: SimpleChanges) {
    if (c["qrToken"] && this.qrToken) this.fetchMenu();
  }

  ngOnInit() {
    this.loadPersistedPastOrders();
    if (this.qrToken && !this.data()) this.fetchMenu();
    this.initSearch();
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  private localSearch(q: string): MenuItem[] {
    const items = (this.data()?.items ?? []) as MenuItem[];
    const needle = q.toLowerCase();
    return items.filter(
      (i) =>
        i.name?.toLowerCase().includes(needle) ||
        i.description?.toLowerCase().includes(needle),
    );
  }

  private initSearch() {
    const terms$ = this.searchControl.valueChanges.pipe(
      takeUntil(this.destroy),
    );

    // Instant local filter on every keystroke — no debounce, no DB hit.
    terms$.subscribe((term) => {
      const q = term?.trim() ?? "";
      this.searchQuery.set(q);
      this.currentPage.set(1);
      if (!q) {
        this.searchResults.set([]);
        return;
      }
      this.searchResults.set(this.localSearch(q));
    });

    // Only hit the API if the local menu had no match for this term,
    // and only after the user pauses typing.
    terms$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          const q = term?.trim() ?? "";
          if (!q || this.localSearch(q).length > 0) return of(null);

          const sessionToken = this.data()?.sessionToken;
          if (!sessionToken) return of(null);
          return this.api.get<MenuItem[]>("/public/search", {
            sessionToken,
            q,
          });
        }),
        takeUntil(this.destroy),
      )
      .subscribe({
        next: (res) => {
          if (res && this.searchControl.value?.trim() === this.searchQuery())
            this.searchResults.set(res.data);
        },
        error: () => {
          this.searchResults.set([]);
        },
      });
  }

  clearSearch() {
    this.searchControl.setValue("");
    this.searchQuery.set("");
    this.searchResults.set([]);
  }

  private fetchMenu() {
    this.loading.set(true);
    this.fetchError.set(null);
    const storedToken = this.isBrowser
      ? localStorage.getItem(this.tokenKey())
      : null;
    const params = storedToken ? { customerToken: storedToken } : undefined;
    this.api.get<any>(`/public/qr/${this.qrToken}`, params).subscribe({
      next: ({ data }) => {
        if (data.tableFull) {
          this.tableFull.set({
            capacity: data.capacity,
            seatsOccupied: data.seatsOccupied,
          });
          this.loading.set(false);
          return;
        }
        this.data.set(data);
        this.loading.set(false);
        this.restoreCustomerSession();
      },
      error: (err: any) => {
        const msg =
          err?.error?.message || "Something went wrong. Please try again.";
        const code =
          err?.error?.code || (err?.status === 403 ? "FORBIDDEN" : "ERROR");
        this.fetchError.set({ message: msg, code });
        this.data.set(null);
        this.loading.set(false);
      },
    });
  }

  private subscribeCustomerSocket(customerToken: string) {
    this.sock.joinCustomerRoom(customerToken);
    this.sock.on<any>("bill:updated").subscribe((b: any) => {
      this.bill.set(b);
      // Order just got paid — snapshot it as history so it survives a reload.
      if (b?.paid) {
        const merged = [this.billToPastEntry(b), ...this.pastOrders()].slice(0, 5);
        this.persistPastOrders(merged);
      }
    });
    this.sock.on<any>("order:updated").subscribe(() => this.refreshBill());
  }

  private restoreCustomerSession() {
    if (!this.isBrowser) return;
    const stored = localStorage.getItem(this.tokenKey());
    if (!stored) return;

    this.api.get<any>(`/public/bill/${stored}`).subscribe({
      next: ({ data }) => {
        // Dining finished (paid) or the table session was closed → free the
        // browser for a fresh order and keep the completed order as history.
        const completed = data.paid || data.sessionStatus === "CLOSED";
        if (completed) {
          const merged = [
            this.billToPastEntry(data),
            ...(data.pastOrders || []),
          ].slice(0, 5);
          this.persistPastOrders(merged);
          this.pastOrders.set(merged);
          this.clearCustomerSession();
          return;
        }

        this.customerToken.set(stored);
        this.bill.set(data);
        if (data.pastOrders?.length) {
          this.pastOrders.set(data.pastOrders);
          this.persistPastOrders(data.pastOrders);
        }
        this.subscribeCustomerSocket(stored);
      },
      error: () => {
        // Stale/expired token — drop it but keep showing previous orders.
        this.clearCustomerSession();
        this.loadPersistedPastOrders();
      },
    });
  }

  // Called when user clicks Place Order — opens identity popup if not yet identified
  requestPlaceOrder() {
    if (!this.customerToken()) {
      this.identityError.set("");
      this.showIdentityModal.set(true);
    } else {
      this.doPlaceOrder();
    }
  }

  submitIdentity() {
    this.identityError.set("");
    if (!this.custName.trim()) {
      this.identityError.set("Please enter your name");
      return;
    }
    if (!this.isMobileValid()) {
      this.identityError.set("Please enter a valid 10-digit mobile number");
      return;
    }

    this.submittingIdentity.set(true);
    this.api
      .post<any>("/public/customer-session", {
        sessionToken: this.data().sessionToken,
        customerName: this.custName.trim(),
        mobileNumber: this.custMobile.trim(),
      })
      .subscribe({
        next: ({ data }) => {
          const token = data.customerToken;
          if (this.isBrowser) localStorage.setItem(this.tokenKey(), token);
          this.customerToken.set(token);
          if (data.pastOrders?.length) this.pastOrders.set(data.pastOrders);
          this.submittingIdentity.set(false);
          this.showIdentityModal.set(false);
          this.subscribeCustomerSocket(token);
          this.refreshBill();
          this.doPlaceOrder();
        },
        error: (err: any) => {
          this.identityError.set(
            err?.error?.message || "Something went wrong. Please try again.",
          );
          this.submittingIdentity.set(false);
        },
      });
  }

  private doPlaceOrder() {
    this.placing.set(true);
    this.api
      .post<any>("/public/orders", {
        sessionToken: this.data().sessionToken,
        customerToken: this.customerToken(),
        orderType: this.orderType(),
        items: this.cart().map((l) => ({ menuItemId: l.item._id, qty: l.qty })),
      })
      .subscribe({
        next: (res: any) => {
          this.cart.set([]);
          this.placing.set(false);
          this.showDiscountBanner(res?.data?.order?.discount);
        },
        error: (e: any) => {
          this.placing.set(false);
          const msg = e?.error?.message || "";
          // Stale session (e.g. previous bill was paid / table reopened):
          // forget it and ask the guest to re-enter their details, keeping the
          // cart intact so the order goes through on the next try.
          if (e?.status === 401 || /identity could not be verified/i.test(msg)) {
            this.clearCustomerSession();
            this.identityError.set("");
            this.showIdentityModal.set(true);
            return;
          }
          alert(msg || "Failed to place order. Please try again.");
        },
      });
  }

  /** Show the "🎉 You received …" message for a discount applied to the order. */
  private showDiscountBanner(discount: any) {
    if (!discount || !(discount.amount > 0)) return;
    const msg = discount.type === "PERCENTAGE"
      ? `🎉 You received ${discount.value}% discount (₹${discount.amount} off)`
      : `🎉 You received ₹${discount.amount} discount`;
    this.discountBanner.set(msg);
    clearTimeout(this.discountBannerTimer);
    this.discountBannerTimer = setTimeout(() => this.discountBanner.set(""), 6000);
  }

  getQty(item: MenuItem): number {
    return this.cart().find((l) => l.item._id === item._id)?.qty ?? 0;
  }

  add(item: MenuItem) {
    const lines = [...this.cart()];
    const ex = lines.find((l) => l.item._id === item._id);
    if (ex) ex.qty++;
    else lines.push({ item, qty: 1 });
    this.cart.set(lines);
  }

  remove(item: MenuItem) {
    const lines = [...this.cart()];
    const idx = lines.findIndex((l) => l.item._id === item._id);
    if (idx === -1) return;
    if (lines[idx].qty > 1) lines[idx].qty--;
    else lines.splice(idx, 1);
    this.cart.set(lines);
  }

  openTip() {
    this.tipError.set("");
    this.tipAmount = null;
    this.showTipModal.set(true);
  }

  closeTip() {
    this.showTipModal.set(false);
  }

  submitTip() {
    this.tipError.set("");
    const amt = Number(this.tipAmount);
    if (!amt || amt <= 0) {
      this.tipError.set("Please enter a valid tip amount");
      return;
    }
    const token = this.customerToken();
    if (!token) return;

    this.submittingTip.set(true);
    this.api.post<any>(`/public/tip/${token}`, { amount: amt }).subscribe({
      next: () => {
        this.submittingTip.set(false);
        this.showTipModal.set(false);
        this.refreshBill();
      },
      error: (err: any) => {
        this.submittingTip.set(false);
        this.tipError.set(
          err?.error?.message || "Could not add tip. Please try again.",
        );
      },
    });
  }

  refreshBill() {
    const token = this.customerToken();
    if (token)
      this.api.get<any>(`/public/bill/${token}`).subscribe({
        next: ({ data }) => this.bill.set(data),
        error: () => {},
      });
  }

  viewReceipt() {
    const token = this.customerToken();
    if (!token) return;
    this.api.get<any>(`/public/receipt/${token}`).subscribe({
      next: ({ data }) => this.receipt.set(data),
      error: () => {},
    });
  }

  closeReceipt() {
    this.receipt.set(null);
  }

  printReceipt() {
    const r = this.receipt();
    if (!r) return;

    const items = (r.items || [])
      .map(
        (i: any) => `
      <tr>
        <td>${i.name}${i.variant ? ` <span style="color:#666;font-size:10px;">(${i.variant})</span>` : ""}</td>
        <td style="text-align:right">${i.qty}</td>
        <td style="text-align:right">${(+i.unitPrice).toFixed(2)}</td>
        <td style="text-align:right">${(+i.lineTotal).toFixed(2)}</td>
      </tr>`,
      )
      .join("");

    const taxes = (r.summary?.taxes || [])
      .filter((t: any) => (t.amount || 0) > 0)
      .map(
        (t: any) =>
          `<div style="display:flex;justify-content:space-between;font-size:11px;padding:.15rem 0;color:#555;"><span>${t.name}</span><span>&#8377;${(+t.amount).toFixed(2)}</span></div>`,
      )
      .join("");

    const billTaxes = (r.summary?.billTaxes || [])
      .filter((t: any) => (t.amount || 0) > 0)
      .map(
        (t: any) =>
          `<div style="display:flex;justify-content:space-between;font-size:11px;padding:.15rem 0;color:#555;"><span>${t.name}</span><span>&#8377;${(+t.amount).toFixed(2)}</span></div>`,
      )
      .join("");

    const serviceChargeLine = r.summary?.serviceCharge
      ? `<div style="display:flex;justify-content:space-between;font-size:11px;padding:.15rem 0;color:#555;"><span>Service Charge (${r.summary.serviceChargePercent}%)</span><span>&#8377;${(+r.summary.serviceCharge).toFixed(2)}</span></div>`
      : "";

    const d0 = r.summary?.discounts?.[0];
    const discountLine = (r.summary?.discountAmount || 0) > 0
      ? `<div style="display:flex;justify-content:space-between;font-size:11px;padding:.15rem 0;color:#059669;font-weight:600;"><span>Discount${d0?.name ? ` (${d0.name})` : ""}${d0 ? ` &middot; ${d0.type === "PERCENTAGE" ? d0.value + "%" : "&#8377;" + d0.value}` : ""}</span><span>&#8722;&#8377;${(+r.summary.discountAmount).toFixed(2)}</span></div>`
      : "";

    const logo = r.restaurant?.logoUrl
      ? `<img src="${r.restaurant.logoUrl}" style="width:64px;height:64px;object-fit:contain;border-radius:8px;margin-bottom:.5rem;">`
      : "";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Receipt #${r.order?.orderId}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; font-size: 12px; color: #111; background: #fff; }
        .rcpt { max-width: 320px; margin: 0 auto; padding: 16px; text-align: center; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin: .5rem 0; }
        th { border-bottom: 1px dashed #999; padding: .25rem .1rem; font-weight: bold; text-align: left; }
        td { padding: .2rem .1rem; vertical-align: top; }
        .details { text-align: left; margin: .5rem 0; }
        .row { display: flex; justify-content: space-between; font-size: 11px; padding: .15rem 0; }
        .row span:first-child { color: #666; }
        .row span:last-child { font-weight: 600; }
        .grand { font-size: 14px; font-weight: bold; padding: .5rem 0; }
        @media print { @page { margin: 8mm; } }
      </style>
    </head><body><div class="rcpt">
      ${logo}
      <div style="font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.2rem;">${r.restaurant?.name || ""}</div>
      ${r.restaurant?.address ? `<div style="font-size:11px;color:#444;margin:.1rem 0;">${r.restaurant.address}</div>` : ""}
      ${r.restaurant?.phone ? `<div style="font-size:11px;color:#444;margin:.1rem 0;">📞 ${r.restaurant.phone}</div>` : ""}
      ${r.restaurant?.gstin ? `<div style="font-size:11px;color:#444;margin:.1rem 0;">GSTIN: ${r.restaurant.gstin}</div>` : ""}
      ${r.restaurant?.email ? `<div style="font-size:11px;color:#444;margin:.1rem 0;">${r.restaurant.email}</div>` : ""}
      <div style="color:#666;margin:.5rem 0;overflow:hidden;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
      <div style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.06em;margin:.2rem 0;">TAX INVOICE / CUSTOMER RECEIPT</div>
      <div style="color:#666;margin:.5rem 0;overflow:hidden;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
      <div class="details">
        <div class="row"><span>Order ID</span><span>${r.order?.orderId}</span></div>
        <div class="row"><span>Table</span><span>${r.order?.tableName || r.order?.tableNumber}</span></div>
        <div class="row"><span>Customer</span><span>${r.order?.customerName}</span></div>
        <div class="row"><span>Mobile</span><span>${r.order?.customerMobile}</span></div>
        <div class="row"><span>Date</span><span>${r.order?.orderDate ? new Date(r.order.orderDate).toLocaleString("en-IN") : ""}</span></div>
        <div class="row"><span>Generated</span><span>${r.order?.generatedAt ? new Date(r.order.generatedAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN")}</span></div>
      </div>
      <div style="color:#999;margin:.4rem 0;overflow:hidden;">───────────────────────────────────</div>
      <table><thead><tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amt</th></tr></thead>
      <tbody>${items}</tbody></table>
      <div style="color:#999;margin:.4rem 0;overflow:hidden;">───────────────────────────────────</div>
      <div style="text-align:left;">
        <div class="row"><span>Subtotal</span><span>&#8377;${(+(r.summary?.subtotal || 0)).toFixed(2)}</span></div>
        ${taxes}
        ${billTaxes}
        ${discountLine}
        ${serviceChargeLine}
        <div style="color:#999;margin:.4rem 0;overflow:hidden;">───────────────────────────────────</div>
        <div class="row grand"><span>GRAND TOTAL</span><span>&#8377;${(+(r.summary?.grandTotal || 0)).toFixed(2)}</span></div>
      </div>
      <div style="color:#666;margin:.5rem 0;overflow:hidden;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
      <div style="font-size:12px;font-weight:bold;margin:.3rem 0;">Thank You For Visiting!</div>
      <div style="font-size:11px;color:#666;margin:.15rem 0;">Visit Again Soon</div>
      ${r.restaurant?.website ? `<div style="font-size:10px;color:#777;margin-top:.15rem;">${r.restaurant.website}</div>` : ""}
    </div></body></html>`;

    const w = window.open("", "_blank", "width=420,height=700");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.onload = () => {
      w.print();
      w.close();
    };
  }
}
