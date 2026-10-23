import { expect, it } from 'vitest';
import {
  composerChangeSchema,
  canvasReadySchema,
} from '../src/lib/inline-preview';
import { richTextHtml } from '../src/lib/blocks';
it('limits canvas commands to validated block and header changes', () => {
  const base = {
    type: 'pager:composer-change',
    version: 1,
    pageId: 'page',
    sequence: 1,
  };
  expect(
    composerChangeSchema.safeParse({
      ...base,
      action: 'size',
      field: 'logoSize',
      value: 80,
    }).success,
  ).toBe(true);
  expect(
    composerChangeSchema.safeParse({
      ...base,
      action: 'size',
      field: 'logoSize',
      value: 5000,
    }).success,
  ).toBe(false);
  expect(
    composerChangeSchema.safeParse({
      ...base,
      action: 'header',
      field: 'title',
      value: 'bad\nline',
    }).success,
  ).toBe(false);
  expect(
    composerChangeSchema.safeParse({
      ...base,
      action: 'block',
      block: {
        id: 'x',
        type: 'text',
        content: {
          type: 'doc',
          content: [{ type: 'image', attrs: { src: 'https://example.test' } }],
        },
      },
    }).success,
  ).toBe(false);
  expect(
    composerChangeSchema.safeParse({
      ...base,
      action: 'select',
      blockId: 'x',
      ownerId: 'foreign',
    }).success,
  ).toBe(false);
});
it('escapes rich text without accepting nested paragraphs or executable links', () => {
  expect(
    richTextHtml({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '<script>alert(1)</script>',
              marks: [{ type: 'bold' }],
            },
          ],
        },
      ],
    }),
  ).toBe('<p><strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong></p>');
  expect(() =>
    richTextHtml({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'paragraph' }] }],
    }),
  ).toThrow();
});

it('accepts only bounded readiness messages for the isolated owner canvas', () => {
  expect(
    canvasReadySchema.safeParse({
      type: 'pager:canvas-ready',
      version: 1,
      pageId: 'draft',
    }).success,
  ).toBe(true);
  expect(
    canvasReadySchema.safeParse({
      type: 'pager:canvas-ready',
      version: 1,
      pageId: '',
      ownerId: 'foreign',
    }).success,
  ).toBe(false);
});
