import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';

@Injectable({ providedIn: 'root' })
export class QrService {
  
  // Generate QR code as Data URL (for <img> tag)
  async generateQRDataUrl(text: string, options: any = {}): Promise<string> {
    const defaultOptions: QRCode.QRCodeToDataURLOptions = {
      errorCorrectionLevel: 'H' as const,
      type: 'image/png' as const,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      ...options
    };

    return QRCode.toDataURL(text, defaultOptions) as Promise<string>;
  }

  // Generate QR code as Canvas
  async generateQRCanvas(elementId: string, text: string, options: any = {}): Promise<void> {
    const defaultOptions: any = {
      errorCorrectionLevel: 'H' as const,
      margin: 1,
      width: 300,
      ...options
    };

    const canvas = document.getElementById(elementId) as HTMLCanvasElement;
    if (canvas) {
      await QRCode.toCanvas(canvas, text, defaultOptions);
    }
  }

  // Download QR code as PNG
  downloadQR(text: string, filename: string): void {
    QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H' as const,
      type: 'image/png' as const,
      margin: 1,
      width: 400,
      color: { dark: '#000000', light: '#FFFFFF' }
    }).then(url => {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Print QR code
  printQR(text: string, title: string, tableNumber?: number): void {
    QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H' as const,
      type: 'image/png' as const,
      margin: 2,
      width: 600,
      color: { dark: '#000000', light: '#FFFFFF' }
    }).then(url => {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>QR Code - ${title}</title>
            <style>
              body { 
                display: flex; 
                flex-direction: column;
                justify-content: center; 
                align-items: center; 
                height: 100vh;
                margin: 0;
                font-family: Arial, sans-serif;
              }
              .qr-container {
                text-align: center;
                padding: 40px;
                border: 3px solid #333;
                border-radius: 10px;
              }
              img { 
                max-width: 400px; 
                margin: 20px 0;
              }
              h2 { margin: 10px 0; }
              p { margin: 5px 0; color: #666; }
              @media print {
                body { height: auto; }
                .qr-container { border: none; }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h2>${title}</h2>
              ${tableNumber ? `<p>Table #${tableNumber}</p>` : ''}
              <img src="${url}" alt="QR Code">
              <p style="font-size: 12px; color: #999;">Scan to order</p>
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    });
  }
}
