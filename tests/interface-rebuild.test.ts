import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('MoviesRule operational dashboard contract', () => {
  it('contains the approved autonomous publishing interface surfaces', () => {
    const page = fs.readFileSync('src/app/stats/page.tsx', 'utf8');
    for (const label of ['Dashboard', 'Articles', 'Research', 'Sources', 'Newsletter', 'Settings']) {
      expect(page).toContain(label);
    }
    for (const label of ['Recent Articles', 'Sources', 'Pipeline', 'Next Run']) {
      expect(page).toContain(label);
    }
  });
});
