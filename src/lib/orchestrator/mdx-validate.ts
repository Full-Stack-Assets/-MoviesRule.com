// `next-mdx-remote/serialize` is an ESM-only package whose transitive deps
// (estree-walker via estree-util-build-jsx) expose `exports` maps that tsx's
// CommonJS loader can't resolve — a *static* import here would crash the
// pipeline at load time when run under `tsx` (the Action's path). A dynamic
// `import()` routes through Node's ESM resolver instead, which handles those
// maps correctly, and works equally well inside the Next build. Cache the
// resolved module so repeated validations don't re-import.
type SerializeFn = (source: string) => Promise<unknown>;
let serializePromise: Promise<SerializeFn> | undefined;
function getSerialize(): Promise<SerializeFn> {
  serializePromise ??= import('next-mdx-remote/serialize').then(
    (m) => m.serialize as SerializeFn
  );
  return serializePromise;
}

/**
 * Compile an MDX body through the exact pipeline the site renders with
 * (`next-mdx-remote` → `@mdx-js/mdx`). A generated post can satisfy `PostSchema`
 * yet still contain MDX the renderer rejects — e.g. a malformed component tag
 * like `<P rosCons>` (a stray space splitting `<ProsCons>`). The schema only
 * checks shape and length, so such a body sails through generation and then
 * aborts the *production build* the moment Next tries to prerender the page —
 * one bad post takes down the whole deploy.
 *
 * Compiling here, at generation time, lets the retry loop catch it and feed the
 * compiler's own error back to the model, so a body that won't render never
 * reaches commit. `serialize` only compiles — it does not render — so no
 * component map is needed; an unknown component like `<ProsCons>` compiles fine,
 * only genuinely malformed MDX throws.
 *
 * @returns a trimmed one-line compiler error, or `null` when the body compiles.
 */
export async function mdxCompileError(body: string): Promise<string | null> {
  try {
    const serialize = await getSerialize();
    await serialize(body);
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // The raw message is multi-line: a "[next-mdx-remote] error compiling MDX:"
    // header, the actual reason + source location, then a code frame and a
    // doc link. Keep just the reason line so the retry prompt stays short and
    // actionable; fall back to the first line if the shape is unexpected.
    const reason = msg
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .find(
        (l) =>
          !/^\[next-mdx-remote\]/i.test(l) && // header
          !/^more information/i.test(l) && // doc link
          !/^[>|^]/.test(l) && // code-frame gutter / caret
          !/^\d+\s*\|/.test(l) // "18 | <P rosCons>"
      );
    return reason ?? msg.split('\n')[0] ?? 'MDX failed to compile';
  }
}
