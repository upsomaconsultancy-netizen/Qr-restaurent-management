import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoConfig {
  title: string;
  description: string;
  /** Absolute or root-relative path of the current page, e.g. '/' or '/privacy-policy'. */
  path?: string;
  image?: string;
  keywords?: string;
  type?: 'website' | 'article';
}

/** Public site origin — used to build canonical + OG URLs. */
const SITE_ORIGIN = 'https://upsoma.in';
const DEFAULT_IMAGE = SITE_ORIGIN + '/qr3.png';

/**
 * Centralised, SSR-safe SEO/AEO/GEO metadata manager.
 * Works on both server (platform-server provides a DOM) and browser.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);

  apply(cfg: SeoConfig): void {
    const url = SITE_ORIGIN + (cfg.path ?? '/');
    const image = cfg.image ?? DEFAULT_IMAGE;

    this.title.setTitle(cfg.title);

    const tags: Array<{ name?: string; property?: string; content: string }> = [
      { name: 'description', content: cfg.description },
      { name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
      { name: 'author', content: 'Upsoma Restro' },
      // Open Graph (social + many AI crawlers)
      { property: 'og:title', content: cfg.title },
      { property: 'og:description', content: cfg.description },
      { property: 'og:type', content: cfg.type ?? 'website' },
      { property: 'og:url', content: url },
      { property: 'og:image', content: image },
      { property: 'og:site_name', content: 'Upsoma Restro' },
      { property: 'og:locale', content: 'en_IN' },
      // Twitter
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: cfg.title },
      { name: 'twitter:description', content: cfg.description },
      { name: 'twitter:image', content: image },
    ];
    if (cfg.keywords) tags.push({ name: 'keywords', content: cfg.keywords });

    for (const t of tags) {
      const selector = t.name ? `name="${t.name}"` : `property="${t.property}"`;
      this.meta.updateTag(t as any, selector);
    }

    this.setCanonical(url);
  }

  /** Inject (or replace) a JSON-LD structured-data block. `id` keeps blocks idempotent. */
  setJsonLd(id: string, data: Record<string, any>): void {
    const head = this.doc.head;
    if (!head) return;
    const existing = this.doc.getElementById(id);
    if (existing) existing.remove();
    const script = this.doc.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.text = JSON.stringify(data);
    head.appendChild(script);
  }

  private setCanonical(url: string): void {
    const head = this.doc.head;
    if (!head) return;
    let link = this.doc.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  get origin(): string {
    return SITE_ORIGIN;
  }
}
