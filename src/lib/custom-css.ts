import * as css from 'css-tree';

export const CUSTOM_CSS_LIMIT = 20_000;
export type CssResult = { css: string; error: string | null };
const functions = new Set(
  (
    'var calc min max clamp round mod rem abs sign pow sqrt hypot log exp sin cos tan asin acos atan atan2 ' +
    'rgb rgba hsl hsla hwb lab lch oklab oklch color color-mix light-dark ' +
    'linear-gradient radial-gradient conic-gradient repeating-linear-gradient repeating-radial-gradient repeating-conic-gradient ' +
    'minmax repeat fit-content cubic-bezier steps translate translatex translatey translatez translate3d ' +
    'scale scalex scaley scalez scale3d rotate rotatex rotatey rotatez rotate3d skew skewx skewy matrix matrix3d perspective ' +
    'blur brightness contrast drop-shadow grayscale hue-rotate invert opacity saturate sepia ' +
    'circle ellipse inset polygon rect xywh counter counters symbols'
  ).split(' '),
);
const pseudoElements = new Set([
  'before',
  'after',
  'marker',
  'first-line',
  'first-letter',
  'selection',
]);
const decoded = (name: string) => css.ident.decode(name).toLowerCase();

/** One compiler for private previews and publication. No HTML or resource loading. */
export function compileCustomCss(source: string, pageId: string): CssResult {
  if (!source.trim()) return { css: '', error: null };
  if (source.length > CUSTOM_CSS_LIMIT)
    return {
      css: '',
      error: `Custom CSS must be ${CUSTOM_CSS_LIMIT.toLocaleString('en')} characters or fewer.`,
    };
  const root = `[data-pager-gallery="${css.string.encode(pageId).slice(1, -1)}"]`;
  function fail(message: string, node: css.CssNode): never {
    const at = node.loc?.start;
    throw new Error(
      `${message}${at ? ` (line ${at.line}, column ${at.column})` : ''}`,
    );
  }
  try {
    const tree = css.parse(source, {
      positions: true,
      parseCustomProperty: true,
      onParseError(error) {
        throw error;
      },
    });
    css.walk(tree, function (node) {
      if (
        node.type === 'Declaration' &&
        node.value.type === 'Value' &&
        node.value.children.isEmpty
      )
        fail('A declaration needs a value.', node);
      if (
        node.type === 'Declaration' &&
        !node.property.startsWith('--') &&
        css.lexer.getProperty(decoded(node.property))
      ) {
        const match = css.lexer.matchProperty(node.property, node.value);
        if (
          match.error &&
          !match.error.message.startsWith('Matching for a tree with var()')
        )
          fail(`Invalid value for ${node.property}.`, node);
      }
      if (node.type === 'Raw' || node.type === 'Url')
        fail(
          'Unsupported syntax or resource URL. External resources are not allowed.',
          node,
        );
      if (
        node.type === 'Atrule' &&
        (this.rule ||
          !['media', 'supports', 'container'].includes(decoded(node.name)) ||
          !node.block)
      )
        fail(
          'Only @media, @supports and @container rules are supported.',
          node,
        );
      if (node.type === 'Rule') {
        if (
          this.rule ||
          this.declaration ||
          node.prelude.type !== 'SelectorList'
        )
          fail(
            'Nested selectors are not supported. Write a separate rule.',
            node,
          );
      }
      if (node.type === 'Function' && !functions.has(decoded(node.name)))
        fail(
          `Unsupported function ${css.ident.decode(node.name)}(). Resource and attribute functions are not allowed.`,
          node,
        );
      if (
        node.type === 'PseudoElementSelector' &&
        !pseudoElements.has(decoded(node.name))
      )
        fail('This pseudo-element is not supported.', node);
      if (
        node.type === 'PseudoClassSelector' &&
        decoded(node.name) === 'scope'
      ) {
        const replacement = css.parse(`:where(${root})`, {
          context: 'selector',
        }) as css.Selector;
        Object.assign(node, replacement.children.first);
      }
    });
    css.walk(tree, {
      visit: 'Rule',
      enter(node) {
        if (node.prelude.type !== 'SelectorList') return;
        node.prelude.children.forEach((selector) => {
          // Guard the target, not merely an ancestor: even :scope + .editor cannot escape.
          if (selector.type !== 'Selector') return;
          const guard = (
            css.parse(
              `:where(${root}:not([data-pager-editor-ui], [data-pager-editor-ui] *), ${root} *:not([data-pager-editor-ui], [data-pager-editor-ui] *))`,
              {
                context: 'selector',
              },
            ) as css.Selector
          ).children.first!;
          let before: css.ListItem<css.CssNode> | undefined;
          selector.children.forEach((n, item) => {
            if (!before && n.type === 'PseudoElementSelector') before = item;
          });
          if (before) selector.children.insertData(guard, before);
          else selector.children.appendData(guard);
        });
      },
    });
    return { css: css.generate(tree), error: null };
  } catch (error) {
    return {
      css: '',
      error: error instanceof Error ? error.message : 'Invalid CSS.',
    };
  }
}

/** Compiled CSS is serialized as CSS text, never as author-supplied HTML. */
export function stylesheetMarkup(compiled: string): string {
  return compiled ? `<style>${compiled.replaceAll('<', '\\3c ')}</style>` : '';
}
