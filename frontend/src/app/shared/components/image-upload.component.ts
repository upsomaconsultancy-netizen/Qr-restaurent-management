import { Component, EventEmitter, Input, OnDestroy, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ImageCompressorService } from '../services/image-compressor.service';

export type UploadFolder = 'menu' | 'category' | 'logo';
export type UploadStatus = 'idle' | 'compressing' | 'uploading' | 'done' | 'error';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="image-upload">
      <input type="file" class="form-control form-control-sm" accept="image/jpeg,image/png,image/webp"
        (change)="onFileSelected($event)" [disabled]="status() === 'compressing' || status() === 'uploading'">

      @if (previewUrl()) {
        <div class="mt-2">
          <img [src]="previewUrl()" alt="Preview" class="rounded border" style="max-width:140px;max-height:140px;object-fit:cover;">
        </div>
      }

      @switch (status()) {
        @case ('compressing') {
          <div class="small text-muted mt-1">Compressing image...</div>
        }
        @case ('uploading') {
          <div class="mt-1">
            <div class="progress" style="height:6px;">
              <div class="progress-bar" [style.width]="progress() + '%'"></div>
            </div>
            <div class="small text-muted mt-1">Uploading... {{ progress() }}%</div>
          </div>
        }
        @case ('done') {
          <div class="small text-success mt-1">&#10003; Image ready</div>
        }
        @case ('error') {
          <div class="small text-danger mt-1">
            {{ errorMsg() }}
            @if (canRetry()) {
              <button type="button" class="btn btn-sm btn-outline-danger ms-2" (click)="retry()">Retry</button>
            }
          </div>
        }
      }
    </div>
  `
})
export class ImageUploadComponent implements OnDestroy {
  @Input() folder!: UploadFolder;
  @Input() imageUrl: string | null = null;
  @Input() imagePublicId: string | null = null;
  @Output() imageUrlChange = new EventEmitter<string | null>();
  @Output() imagePublicIdChange = new EventEmitter<string | null>();

  private api = inject(ApiService);
  private compressor = inject(ImageCompressorService);

  status = signal<UploadStatus>('idle');
  progress = signal(0);
  previewUrl = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  private lastFileKey: string | null = null;
  private lastCompressedBlob: Blob | null = null;
  private lastFileName = 'image.jpg';
  private currentUpload$: Subscription | null = null;
  private objectUrl: string | null = null;
  private currentPublicId: string | null = null;

  ngOnInit() {
    if (this.imageUrl) this.previewUrl.set(this.imageUrl);
    this.currentPublicId = this.imagePublicId;
  }

  canRetry(): boolean {
    return this.status() === 'error' && !!this.lastCompressedBlob;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const fileKey = `${file.name}:${file.size}:${file.lastModified}`;
    if (fileKey === this.lastFileKey && (this.status() === 'uploading' || this.status() === 'done')) {
      return; // same file already uploaded or in flight — ignore duplicate selection
    }

    this.currentUpload$?.unsubscribe();
    this.lastFileKey = fileKey;
    this.lastFileName = file.name;
    this.errorMsg.set(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      this.status.set('error');
      this.errorMsg.set('Only JPG, PNG, or WEBP images are allowed.');
      this.lastCompressedBlob = null;
      return;
    }

    this.runCompressAndUpload(file);
  }

  retry() {
    if (!this.lastCompressedBlob) return;
    this.errorMsg.set(null);
    this.startUpload(this.lastCompressedBlob);
  }

  private async runCompressAndUpload(file: File) {
    this.status.set('compressing');
    let blob: Blob;
    try {
      blob = await this.compressor.compress(file);
    } catch (e: any) {
      this.status.set('error');
      this.errorMsg.set(e?.message || 'Could not compress this image below 100 KB.');
      this.lastCompressedBlob = null;
      return;
    }

    this.lastCompressedBlob = blob;
    this.setPreview(URL.createObjectURL(blob));
    this.startUpload(blob);
  }

  private startUpload(blob: Blob) {
    this.status.set('uploading');
    this.progress.set(0);

    const formData = new FormData();
    formData.append('image', blob, this.lastFileName);
    formData.append('folder', this.folder);

    const previousPublicId = this.currentPublicId;

    this.currentUpload$ = this.api.uploadWithProgress<{ secure_url: string; public_id: string }>('/tenant/uploads/image', formData)
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.progress.set(Math.round((100 * event.loaded) / event.total));
          } else if (event.type === HttpEventType.Response) {
            const data = event.body?.data;
            if (!data) return;
            if (previousPublicId && previousPublicId !== data.public_id) {
              this.api.deleteWithBody('/tenant/uploads/image', { publicId: previousPublicId }).subscribe();
            }
            this.currentPublicId = data.public_id;
            this.status.set('done');
            this.imageUrlChange.emit(data.secure_url);
            this.imagePublicIdChange.emit(data.public_id);
          }
        },
        error: () => {
          this.status.set('error');
          this.errorMsg.set('Upload failed. Tap Retry to try again.');
        }
      });
  }

  private setPreview(url: string) {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = url;
    this.previewUrl.set(url);
  }

  ngOnDestroy() {
    this.currentUpload$?.unsubscribe();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }
}
