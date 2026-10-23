import { blockSchema, type PageBlock } from './blocks';
import { pageInputSchema, type PageInput, type ClientUi } from './contracts';

const defaults = pageInputSchema.parse({
  title: 'Defaults',
  slug: 'defaults',
  bannerHeight: null,
});
const keys = [
  'theme',
  'background',
  'foreground',
  'accent',
  'alignment',
  'bannerPosition',
  'headerLayout',
  'headerSize',
  'bannerHeight',
  'logoSize',
  'titleSize',
  'descriptionSize',
  'headerSpacing',
  'customCss',
  'clientUi',
  'galleryStyle',
] as const;
type Customization = Pick<PageInput, (typeof keys)[number]>;
export const customizationDefaults = Object.fromEntries(
  keys.map((key) => [key, defaults[key]]),
) as Customization;

export function resetBlockPresentation(block: PageBlock): PageBlock {
  const preset = blockSchema.parse({ id: block.id, type: block.type });
  if (block.type === 'albums' && preset.type === 'albums')
    return {
      ...block,
      layout: preset.layout,
      order: preset.order,
      grouping: preset.grouping,
    };
  if (block.type === 'photos' && preset.type === 'photos')
    return {
      ...block,
      layout: preset.layout,
      columns: preset.columns,
      gap: preset.gap,
      rowHeight: preset.rowHeight,
    };
  if (block.type === 'text' && preset.type === 'text')
    return { ...block, alignment: preset.alignment };
  return block;
}

export function resetCustomization(page: PageInput): PageInput {
  return {
    ...page,
    ...structuredClone(customizationDefaults),
    order: defaults.order,
    blocks: page.blocks?.map(resetBlockPresentation),
  };
}

export function resetClientUiValue(
  current: ClientUi,
  key: keyof ClientUi,
): ClientUi {
  const next = { ...current, [key]: customizationDefaults.clientUi[key] };
  if (next.showAlbums && !next.showAlbumCovers && !next.showAlbumTitles) {
    next.showAlbumCovers = customizationDefaults.clientUi.showAlbumCovers;
    next.showAlbumTitles = customizationDefaults.clientUi.showAlbumTitles;
  }
  return next;
}
