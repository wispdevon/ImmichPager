import { z } from 'zod';

const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const heading = z.string().max(160).default('');
export const safeLink = (href: string) =>
  /^(https?:\/\/|mailto:)/i.test(href) &&
  ![...href].some((char) => char.charCodeAt(0) <= 32);
export type RichNode = {
  type:
    | 'doc'
    | 'paragraph'
    | 'heading'
    | 'bulletList'
    | 'orderedList'
    | 'listItem'
    | 'text'
    | 'hardBreak';
  text?: string;
  attrs?: { level?: number };
  marks?: { type: 'bold' | 'italic' | 'link'; attrs?: { href: string } }[];
  content?: RichNode[];
};
const nodeSchema: z.ZodType<RichNode> = z.lazy(() =>
  z
    .object({
      type: z.enum([
        'doc',
        'paragraph',
        'heading',
        'bulletList',
        'orderedList',
        'listItem',
        'text',
        'hardBreak',
      ]),
      text: z.string().max(20000).optional(),
      attrs: z
        .object({ level: z.number().int().min(2).max(3).optional() })
        .strict()
        .optional(),
      marks: z
        .array(
          z
            .object({
              type: z.enum(['bold', 'italic', 'link']),
              attrs: z
                .object({
                  href: z
                    .string()
                    .max(2048)
                    .refine(safeLink, 'Use an http, https or mailto link'),
                })
                .strict()
                .optional(),
            })
            .strict()
            .refine((m) => m.type !== 'link' || !!m.attrs?.href),
        )
        .max(3)
        .optional(),
      content: z.array(nodeSchema).max(500).optional(),
    })
    .strict(),
);
export const richTextSchema = nodeSchema.superRefine((doc, ctx) => {
  let count = 0,
    size = 0;
  const visit = (node: RichNode, depth: number, parent?: string): boolean => {
    if (++count > 2000 || depth > 12) return false;
    size += node.text?.length ?? 0;
    const allowed: Record<string, string[]> = {
      doc: ['paragraph', 'heading', 'bulletList', 'orderedList'],
      paragraph: ['text', 'hardBreak'],
      heading: ['text', 'hardBreak'],
      bulletList: ['listItem'],
      orderedList: ['listItem'],
      listItem: ['paragraph', 'bulletList', 'orderedList'],
    };
    if (parent && !allowed[parent]?.includes(node.type)) return false;
    if (node.attrs && node.type !== 'heading') return false;
    if (node.type === 'doc' && depth !== 0) return false;
    if (depth === 0 && node.type !== 'doc') return false;
    if (node.type === 'text')
      return (
        !!node.text &&
        !node.content &&
        ['paragraph', 'heading'].includes(parent ?? '')
      );
    if (node.text || node.marks) return false;
    if (node.type === 'hardBreak')
      return !node.content && ['paragraph', 'heading'].includes(parent ?? '');
    if (
      node.type === 'listItem' &&
      !['bulletList', 'orderedList'].includes(parent ?? '')
    )
      return false;
    if (
      ['bulletList', 'orderedList'].includes(parent ?? '') &&
      node.type !== 'listItem'
    )
      return false;
    return (node.content ?? []).every((child) =>
      visit(child, depth + 1, node.type),
    );
  };
  if (!visit(doc, 0) || size > 20000)
    ctx.addIssue({
      code: 'custom',
      message: 'Invalid or oversized rich text document',
    });
});
export const emptyText = (): RichNode => ({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});
const unique = (values: string[]) => new Set(values).size === values.length;
export const blockSchema = z.discriminatedUnion('type', [
  z
    .object({
      id,
      type: z.literal('albums'),
      heading,
      albumIds: z
        .array(id)
        .max(500)
        .default([])
        .refine(unique, 'Albums must be unique within a block'),
      layout: z.enum(['cards', 'tiles', 'editorial']).default('cards'),
      order: z.enum(['newest', 'manual']).default('newest'),
      grouping: z.enum(['year', 'none']).default('year'),
    })
    .strict(),
  z
    .object({
      id,
      type: z.literal('photos'),
      heading,
      photos: z
        .array(
          z
            .object({
              id,
              caption: z.string().max(1000).default(''),
              alt: z.string().max(1000).default(''),
            })
            .strict(),
        )
        .max(500)
        .default([])
        .refine(
          (a) => unique(a.map((p) => p.id)),
          'Photos must be unique within a block',
        ),
      layout: z
        .enum(['justified', 'masonry', 'square', 'large', 'carousel'])
        .default('justified'),
      gap: z.number().int().min(0).max(64).default(16),
      columns: z.number().int().min(1).max(6).default(3),
      rowHeight: z.number().int().min(120).max(600).default(260),
    })
    .strict(),
  z
    .object({
      id,
      type: z.literal('text'),
      heading,
      content: richTextSchema.default(emptyText),
      alignment: z.enum(['left', 'center', 'right']).default('left'),
    })
    .strict(),
]);
export const blocksSchema = z
  .array(blockSchema)
  .max(100)
  .refine((a) => unique(a.map((b) => b.id)), 'Block IDs must be unique');
export type PageBlock = z.infer<typeof blockSchema>;
export type AlbumsBlock = Extract<PageBlock, { type: 'albums' }>;
export type PhotosBlock = Extract<PageBlock, { type: 'photos' }>;
export function normalizeContent<
  T extends {
    blocks?: PageBlock[];
    albumIds?: string[];
    order?: 'manual' | 'newest';
  },
>(value: T): T & { blocks: PageBlock[]; albumIds: string[] } {
  z.object({
    blocks: blocksSchema.optional(),
    albumIds: z.array(id).max(500).optional(),
    order: z.enum(['newest', 'manual']).optional(),
  }).parse(value);
  const blocks = value.blocks ?? [
    blockSchema.parse({
      id: 'legacy-albums',
      type: 'albums',
      albumIds: value.albumIds ?? [],
      order: value.order ?? 'newest',
    }),
  ];
  const albumIds = [
    ...new Set(blocks.flatMap((b) => (b.type === 'albums' ? b.albumIds : []))),
  ];
  if (albumIds.length > 500)
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['blocks'],
        message: 'A page can contain at most 500 unique albums',
      },
    ]);
  if (
    value.blocks &&
    value.albumIds &&
    (albumIds.length !== value.albumIds.length ||
      !albumIds.every((a) => value.albumIds!.includes(a)))
  )
    throw new z.ZodError([
      {
        code: 'custom',
        path: ['albumIds'],
        message: 'Albums conflict with block content',
      },
    ]);
  return { ...value, blocks, albumIds };
}
export const pageBlocks = (value: {
  blocks?: PageBlock[];
  albumIds?: string[];
  order?: 'manual' | 'newest';
}) => normalizeContent(value).blocks;
export function textContent(node: RichNode): string {
  return node.text ?? (node.content ?? []).map(textContent).join(' ');
}
export const hasContent = (blocks: PageBlock[]) =>
  blocks.some((b) =>
    b.type === 'albums'
      ? b.albumIds.length > 0
      : b.type === 'photos'
        ? b.photos.length > 0
        : !!(b.heading.trim() || textContent(b.content).trim()),
  );
const escape = (v: string) =>
  v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
export function richTextHtml(doc: RichNode): string {
  const render = (node: RichNode): string => {
    if (node.type === 'text') {
      let text = escape(node.text ?? '');
      for (const mark of node.marks ?? []) {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        if (mark.type === 'italic') text = `<em>${text}</em>`;
        if (mark.type === 'link' && mark.attrs && safeLink(mark.attrs.href))
          text = `<a href="${escape(mark.attrs.href)}" rel="noopener noreferrer">${text}</a>`;
      }
      return text;
    }
    if (node.type === 'hardBreak') return '<br>';
    const inner = (node.content ?? []).map(render).join('');
    const tag = (
      {
        doc: '',
        paragraph: 'p',
        heading: node.attrs?.level === 3 ? 'h3' : 'h2',
        bulletList: 'ul',
        orderedList: 'ol',
        listItem: 'li',
      } as Record<string, string>
    )[node.type];
    return tag ? `<${tag}>${inner}</${tag}>` : inner;
  };
  return render(richTextSchema.parse(doc));
}
export const photoSources = (value: { blocks?: PageBlock[] }) =>
  (value.blocks ?? []).filter(
    (b): b is PhotosBlock => b.type === 'photos' && b.photos.length > 0,
  );
