import { describe, it, expect } from 'vitest';
import { CSS_EXAMPLES, appendCssExample } from '../src/lib/css-examples';
import { compileCustomCss, CUSTOM_CSS_LIMIT } from '../src/lib/custom-css';

describe('CSS example catalogue', () => {
  it('provides distinct examples that compile through the normal resource-blocking gallery compiler', () => {
    expect(new Set(CSS_EXAMPLES.map((item) => item.id)).size).toBe(
      CSS_EXAMPLES.length,
    );
    for (const example of CSS_EXAMPLES) {
      const result = compileCustomCss(example.css, 'example-page', {
        precedence: 'page',
      });
      expect(result.error, example.title).toBeNull();
      expect(result.css).toContain('data-pager-gallery="example-page"');
      expect(result.css).not.toMatch(/@import|@font-face|url\(/i);
    }
  });
  it('appends a named example without modifying authored CSS', () => {
    const authored = '.ip-title { color: red; }\n';
    const example = CSS_EXAMPLES[0];
    expect(appendCssExample(authored, example)).toBe(
      authored + '\n\n/* ' + example.title + ' */\n' + example.css,
    );
    expect(appendCssExample('', example)).toBe(
      '/* ' + example.title + ' */\n' + example.css,
    );
  });
  it('accepts the size boundary and refuses overflow before replacing editor content', () => {
    const example = CSS_EXAMPLES[0];
    const suffix = appendCssExample('x', example).length - 1;
    const authored = 'x'.repeat(CUSTOM_CSS_LIMIT - suffix);
    expect(appendCssExample(authored, example)).toHaveLength(CUSTOM_CSS_LIMIT);
    expect(() => appendCssExample(authored + 'x', example)).toThrow(
      /not enough room/i,
    );
    expect(authored).toHaveLength(CUSTOM_CSS_LIMIT - suffix);
  });
});
