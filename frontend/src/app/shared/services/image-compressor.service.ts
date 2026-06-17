import { Injectable } from '@angular/core';

const TARGET_BYTES = 100 * 1024;
const MAX_WIDTH = 1280;
const MIN_WIDTH = 200;
const MAX_ATTEMPTS = 8;
const MIN_QUALITY = 0.4;

@Injectable({ providedIn: 'root' })
export class ImageCompressorService {
  /** Compresses an image File down to <= 100KB as a JPEG Blob, or throws if it can't get there. */
  async compress(file: File): Promise<Blob> {
    const img = await this.loadImage(file);

    let width = Math.min(img.width, MAX_WIDTH);
    let height = Math.round((img.height / img.width) * width);
    let quality = 0.9;

    let lastBlob: Blob | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const blob = await this.drawAndEncode(img, width, height, quality);
      lastBlob = blob;
      if (blob.size <= TARGET_BYTES) return blob;

      if (quality > MIN_QUALITY) {
        quality = Math.max(MIN_QUALITY, quality - 0.1);
      } else {
        width = Math.round(width * 0.85);
        height = Math.round(height * 0.85);
      }
      if (width < MIN_WIDTH) break;
    }

    if (lastBlob && lastBlob.size <= TARGET_BYTES) return lastBlob;
    throw new Error('Could not compress this image below 100 KB. Please try a smaller or simpler image.');
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('This file could not be read as an image.'));
      };
      img.src = url;
    });
  }

  private drawAndEncode(img: HTMLImageElement, width: number, height: number, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas is not supported in this browser.')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed.'))),
        'image/jpeg',
        quality
      );
    });
  }
}
