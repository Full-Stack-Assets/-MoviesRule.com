import { describe, it, expect } from 'vitest';
import { mdxCompileError } from '@/lib/orchestrator/mdx-validate';

const VALID_BODY = `Lead paragraph here.

<Callout type="takeaway">Synthesis.</Callout>

## What happened
Stuff happened.

<ProsCons>
<Pros><li>a</li><li>b</li><li>c</li></Pros>
<Cons><li>x</li><li>y</li><li>z</li></Cons>
</ProsCons>

## FAQ
<FAQ>
<Question q="q1?">A1.</Question>
<Question q="q2?">A2.</Question>
<Question q="q3?">A3.</Question>
</FAQ>`;

describe('mdxCompileError (the build-outage guard)', () => {
  it('returns null for a well-formed body', async () => {
    expect(await mdxCompileError(VALID_BODY)).toBeNull();
  });

  it('returns null for plain prose with no components', async () => {
    expect(await mdxCompileError('Just a plain paragraph, nothing fancy.')).toBeNull();
  });

  it('catches the exact "<P rosCons>" corruption that broke production', async () => {
    const bad = `Lead.\n\n<P rosCons>\n<Pros><li>a</li></Pros>\n<Cons><li>b</li></Cons>\n</ProsCons>`;
    const err = await mdxCompileError(bad);
    expect(err).not.toBeNull();
    expect(err).toMatch(/closing tag|ProsCons|<P>/i);
  });

  it('catches an unclosed component tag', async () => {
    const bad = `Lead.\n\n## FAQ\n<FAQ>\n<Question q="x">answer\n</FAQ>`;
    expect(await mdxCompileError(bad)).not.toBeNull();
  });

  it('returns a trimmed one-line error (no code-frame noise)', async () => {
    const err = await mdxCompileError(`Lead.\n\n<P rosCons></ProsCons>`);
    expect(err).toBeTruthy();
    expect(err).not.toContain('\n');
    expect(err).not.toMatch(/^\[next-mdx-remote\]/);
  });
});
