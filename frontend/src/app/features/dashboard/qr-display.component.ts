import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QrService } from '../../core/services/qr.service';

@Component({
  selector: 'app-qr-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="qr-container text-center p-3 bg-light rounded">
      <!-- QR Code Image -->
      <div class="mb-3">
        @if (qrDataUrl()) {
          <img [src]="qrDataUrl()" alt="QR Code" class="border" style="max-width: 250px; padding: 10px; background: white;">
        } @else {
          <div class="spinner-border spinner-border-sm" role="status"></div>
        }
      </div>

      <!-- Table Info -->
      <div class="mb-3">
        @if (tableNumber) {
          <h6 class="mb-1">Table #{{ tableNumber }}</h6>
        }
        @if (title) {
          <small class="text-muted d-block">{{ title }}</small>
        }
      </div>

      <!-- Action Buttons -->
      <div class="d-flex gap-2 justify-content-center">
        <button 
          class="btn btn-sm btn-primary" 
          (click)="downloadQR()"
          title="Download QR as PNG">
          📥 Download
        </button>
        <button 
          class="btn btn-sm btn-info" 
          (click)="printQR()"
          title="Print QR Code">
          🖨️ Print
        </button>
      </div>
    </div>
  `,
  styles: [`
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  `]
})
export class QrDisplayComponent implements OnInit {
  @Input() qrToken!: string;
  @Input() tableNumber?: number;
  @Input() title: string = 'Restaurant QR Code';

  private qr = inject(QrService);
  qrDataUrl = signal<string | null>(null);

  async ngOnInit() {
    if (this.qrToken) {
      const url = await this.qr.generateQRDataUrl(
        this.buildQRUrl(),
        { width: 300 }
      );
      this.qrDataUrl.set(url);
    }
  }

  buildQRUrl(): string {
    // Adjust base URL if needed
    const baseUrl = window.location.origin;
    return `${baseUrl}/m/${this.qrToken}`;
  }

  downloadQR() {
    const filename = this.tableNumber 
      ? `table-${this.tableNumber}-qr`
      : 'qr-code';
    this.qr.downloadQR(this.buildQRUrl(), filename);
  }

  printQR() {
    this.qr.printQR(
      this.buildQRUrl(),
      this.title,
      this.tableNumber
    );
  }
}
