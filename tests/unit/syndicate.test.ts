import { describe, it, expect } from 'vitest';
import { microblogText } from '@/lib/syndicate';

describe('microblogText', () => {
  const url = 'https://moviesrule.com/blog/some-post';

  it('composes "title — description" plus the URL when it fits', () => {
    const out = microblogText('Short title', 'Short desc', url);
    expect(out).toBe(`Short title — Short desc\n\n${url}`);
  });

  it('always keeps the full URL at the end', () => {
    const out = microblogText('T'.repeat(400), 'D'.repeat(400), url);
    expect(out.endsWith(`\n\n${url}`)).toBe(true);
  });

  it('drops the description before truncating the title', () => {
    const title = 'A reasonably sized headline about a movie';
    const out = microblogText(title, 'D'.repeat(400), url);
    expect(out).toBe(`${title}\n\n${url}`);
  });

  it('truncates an over-long title with an ellipsis, still fitting the limit', () => {
    const out = microblogText('T'.repeat(400), 'desc', url);
    const lead = out.split('\n\n')[0];
    expect(lead.endsWith('…')).toBe(true);
    // 280 microblog ceiling total (lead + "\n\n" + url)
    expect(out.length).toBeLessThanOrEqual(280);
  });
});
