import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('MoviesRule custom-domain deployment contract', () => {
  it('serves the GitHub Pages export from the moviesrule.com domain root', () => {
    const cname = fs.readFileSync('CNAME', 'utf8').trim();
    const nextConfig = fs.readFileSync('next.config.mjs', 'utf8');
    const pagesWorkflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');

    expect(cname).toBe('moviesrule.com');
    expect(nextConfig).not.toContain("basePath: repoPath");
    expect(nextConfig).not.toContain("assetPrefix: `${repoPath}/`");
    expect(pagesWorkflow).toContain('NEXT_PUBLIC_SITE_URL: https://moviesrule.com');
  });

  it('has exactly one Pages deployment workflow', () => {
    expect(fs.existsSync('.github/workflows/nextjs.yml')).toBe(false);
    expect(fs.existsSync('.github/workflows/pages.yml')).toBe(true);
  });

  it('loads the requested AdSense publisher on every page', () => {
    const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
    const siteConfig = fs.readFileSync('src/site.config.ts', 'utf8');
    const adsConfig = fs.readFileSync('src/lib/ads.ts', 'utf8');

    expect(siteConfig).toContain("adsenseClient: 'ca-pub-3754070789576502'");
    expect(layout).toContain('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}');
    expect(layout).toContain('crossOrigin="anonymous"');
    expect(adsConfig).toContain('export const ADSENSE_CLIENT = ADSENSE_PUBLISHER_ID;');
  });
});
