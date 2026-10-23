import { expect, it } from 'vitest';
import { compileCustomCss, stylesheetMarkup } from '../src/lib/custom-css';

it('compiles root variables, selector lists, pseudo-elements and responsive rules with guarded targets', () => {
  const result = compileCustomCss(
    ':scope { --pager-accent: #abc; } @media (max-width:600px) { .ip-title, h1::before { color: var(--pager-accent); } } @supports (display:grid) { .ip-album-grid, .ip-browse-controls input { gap: 20px; } } @container (width > 400px) { h1 { font-size: clamp(2rem,4vw,4rem); } }',
    'test',
  );
  expect(result.error).toBeNull();
  expect(result.css).toContain('[data-pager-gallery="test"]');
  expect(result.css).toContain('.ip-browse-controls input');
  expect(result.css).toContain('::before');
  expect(result.css).toContain('@container');
});
it.each([
  '@import "https://example.com/a.css";',
  '@font-face { font-family:x; src: url(/secret); }',
  '@keyframes x { from { opacity:0 } }',
  'a { background: url(/secret); }',
  'a { --image: u\\72l(/secret); }',
  'a { background: image-set("https://example.com/a.png" 1x); }',
  'a { background: i\\6d age-set("/a.png" 1x); }',
  'a { background: var(--image, url(/secret)); }',
  'a { content: attr(data-secret); }',
  'a { & b { color:red } }',
  'a { color: }',
  'a { color: nonsense; }',
  'a { @media (width > 1px) { color: red; } }',
  'a::backdrop { color: red; }',
])('rejects unsafe or unsupported CSS: %s', (source) => {
  const result = compileCustomCss(source, 'test');
  expect(result.error).toBeTruthy();
  expect(result.css).toBe('');
});
it('does not allow selectors to target siblings outside the root', () => {
  const result = compileCustomCss(
    ':scope + .editor { display:none; } body, .editor { color:red; }',
    'test',
  );
  expect(result.error).toBeNull();
  expect(result.css.match(/:where\(\[data-pager-gallery=/g)?.length).toBe(4);
});
it('serializes style-closing strings without creating HTML', () => {
  const result = compileCustomCss(
    'h1::after { content: "</style><script>alert(1)</script>"; }',
    'test',
  );
  expect(result.error).toBeNull();
  const markup = stylesheetMarkup(result.css);
  expect(markup.match(/<\/style>/g)).toHaveLength(1);
  expect(markup).not.toContain('<script>');
});
it('limits source size and reports source locations', () => {
  expect(compileCustomCss('a'.repeat(20_001), 'test').error).toContain(
    '20,000',
  );
  expect(
    compileCustomCss('h1 {\n background: url(x);\n}', 'test').error,
  ).toContain('line 2');
});

it('excludes editing controls and their descendants from every authored selector', () => {
  const result = compileCustomCss(
    'button, *::before { display:none; }',
    'page',
  );
  expect(result.error).toBeNull();
  expect(result.css).toContain(
    ':not([data-pager-editor-ui],[data-pager-editor-ui] *)',
  );
});
