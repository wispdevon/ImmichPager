import type { PageInput } from './contracts';

export type HeaderPresetId = 'classic' | 'centered' | 'editorial';

export type HeaderPreset = {
  id: HeaderPresetId;
  label: string;
  description: string;
  appearance: Pick<
    PageInput,
    | 'headerLayout'
    | 'alignment'
    | 'headerSize'
    | 'logoSize'
    | 'titleSize'
    | 'descriptionSize'
    | 'headerSpacing'
  >;
};

export const headerPresets = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'A familiar, left-aligned header below the banner.',
    appearance: {
      headerLayout: 'below',
      alignment: 'left',
      headerSize: 'standard',
      logoSize: 80,
      titleSize: 3,
      descriptionSize: 1.125,
      headerSpacing: 2.5,
    },
  },
  {
    id: 'centered',
    label: 'Centered',
    description: 'A compact, centered header below the banner.',
    appearance: {
      headerLayout: 'below',
      alignment: 'center',
      headerSize: 'compact',
      logoSize: 64,
      titleSize: 2.5,
      descriptionSize: 1,
      headerSpacing: 2,
    },
  },
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'A spacious, centered header over a tall banner.',
    appearance: {
      headerLayout: 'overlay',
      alignment: 'center',
      headerSize: 'tall',
      logoSize: 112,
      titleSize: 3.5,
      descriptionSize: 1.25,
      headerSpacing: 3.5,
    },
  },
] satisfies readonly HeaderPreset[];

export function applyHeaderPreset(
  page: PageInput,
  preset: HeaderPreset,
): PageInput {
  return { ...page, ...preset.appearance };
}
