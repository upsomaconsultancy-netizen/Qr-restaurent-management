import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../services/loader.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-loader',
  template: `
    @if (loader.isLoading()) {
      <div class="loader-overlay">
        <div class="loader-box">
          <video autoplay loop muted playsinline class="loader-video">
            <source src="loader1.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    }
  `,
  styles: [`
    .loader-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(3px);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loader-box {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loader-video {
      width: 160px;
      height: 160px;
      object-fit: cover;
      border-radius: 50%;
    }
  `]
})
export class LoaderComponent {
  loader = inject(LoaderService);
}
