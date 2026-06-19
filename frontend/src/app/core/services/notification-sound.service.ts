import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Waiter alert sound (/notification.wav). Rings on a continuous loop while there
 * is at least one pending waiter-request popup, and stops the moment the waiter
 * closes or serves the last one. A single looping <audio> element guarantees the
 * sound never overlaps no matter how many requests are queued. SSR-safe and
 * resilient to autoplay blocking (rings as soon as the page is interacted with).
 */
@Injectable({ providedIn: 'root' })
export class NotificationSoundService {
  private platformId = inject(PLATFORM_ID);
  private audio?: HTMLAudioElement;
  private ringing = false;

  private el(): HTMLAudioElement | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    if (!this.audio) {
      this.audio = new Audio('/notification.wav');
      this.audio.preload = 'auto';
      this.audio.loop = true;
    }
    return this.audio;
  }

  /** Start (or keep) ringing. Idempotent — calling repeatedly does not overlap. */
  start() {
    const a = this.el();
    if (!a || this.ringing) return;
    this.ringing = true;
    const p = a.play();
    if (p && typeof p.catch === 'function') {
      // Autoplay may be blocked until the waiter interacts — retry stays cheap.
      p.catch(() => { this.ringing = false; });
    }
  }

  /** Stop ringing and rewind so the next alert starts cleanly. */
  stop() {
    this.ringing = false;
    const a = this.audio;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
  }
}
