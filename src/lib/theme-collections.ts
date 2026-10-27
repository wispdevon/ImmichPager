import { themeDefinitionSchema, type ThemeDefinition } from './theme-schema';
import story from '../../static/assets/themes/wedding/story.json' with { type: 'json' };
import stellar from '../../static/assets/themes/wedding/stellar.json' with { type: 'json' };
import ethereal from '../../static/assets/themes/wedding/ethereal.json' with { type: 'json' };
import lens from '../../static/assets/themes/portraiture/lens.json' with { type: 'json' };
import strata from '../../static/assets/themes/portraiture/strata.json' with { type: 'json' };
import dimension from '../../static/assets/themes/portraiture/dimension.json' with { type: 'json' };
import photon from '../../static/assets/themes/wildlife/photon.json' with { type: 'json' };
import highlights from '../../static/assets/themes/wildlife/highlights.json' with { type: 'json' };
import big_picture from '../../static/assets/themes/wildlife/big-picture.json' with { type: 'json' };
import multiverse from '../../static/assets/themes/versatile/multiverse.json' with { type: 'json' };
import editorial from '../../static/assets/themes/versatile/editorial.json' with { type: 'json' };
import parallelism from '../../static/assets/themes/versatile/parallelism.json' with { type: 'json' };

export type PhotographyCategory =
  | 'wedding'
  | 'portraiture'
  | 'wildlife'
  | 'versatile';
export type PhotographyTheme = {
  id: string;
  path: string;
  definition: ThemeDefinition;
};
export const photographyCollections: {
  id: PhotographyCategory;
  label: string;
  description: string;
  themes: PhotographyTheme[];
}[] = [
  {
    id: 'wedding',
    label: 'Wedding',
    description: 'Personal stories, soft color and room for the full day.',
    themes: [
      {
        id: 'wedding-story',
        path: '/page/assets/themes/wedding/story.json',
        definition: themeDefinitionSchema.parse(story.theme),
      },
      {
        id: 'wedding-stellar',
        path: '/page/assets/themes/wedding/stellar.json',
        definition: themeDefinitionSchema.parse(stellar.theme),
      },
      {
        id: 'wedding-ethereal',
        path: '/page/assets/themes/wedding/ethereal.json',
        definition: themeDefinitionSchema.parse(ethereal.theme),
      },
    ],
  },
  {
    id: 'portraiture',
    label: 'Portraiture',
    description:
      'Portrait-led introductions, profile rails and dramatic covers.',
    themes: [
      {
        id: 'portraiture-lens',
        path: '/page/assets/themes/portraiture/lens.json',
        definition: themeDefinitionSchema.parse(lens.theme),
      },
      {
        id: 'portraiture-strata',
        path: '/page/assets/themes/portraiture/strata.json',
        definition: themeDefinitionSchema.parse(strata.theme),
      },
      {
        id: 'portraiture-dimension',
        path: '/page/assets/themes/portraiture/dimension.json',
        definition: themeDefinitionSchema.parse(dimension.theme),
      },
    ],
  },
  {
    id: 'wildlife',
    label: 'Wildlife',
    description:
      'Immersive landscapes, field notes and uninterrupted photographs.',
    themes: [
      {
        id: 'wildlife-photon',
        path: '/page/assets/themes/wildlife/photon.json',
        definition: themeDefinitionSchema.parse(photon.theme),
      },
      {
        id: 'wildlife-highlights',
        path: '/page/assets/themes/wildlife/highlights.json',
        definition: themeDefinitionSchema.parse(highlights.theme),
      },
      {
        id: 'wildlife-big-picture',
        path: '/page/assets/themes/wildlife/big-picture.json',
        definition: themeDefinitionSchema.parse(big_picture.theme),
      },
    ],
  },
  {
    id: 'versatile',
    label: 'One size fits all',
    description:
      'Flexible image walls and project collections for any photographer.',
    themes: [
      {
        id: 'versatile-multiverse',
        path: '/page/assets/themes/versatile/multiverse.json',
        definition: themeDefinitionSchema.parse(multiverse.theme),
      },
      {
        id: 'versatile-editorial',
        path: '/page/assets/themes/versatile/editorial.json',
        definition: themeDefinitionSchema.parse(editorial.theme),
      },
      {
        id: 'versatile-parallelism',
        path: '/page/assets/themes/versatile/parallelism.json',
        definition: themeDefinitionSchema.parse(parallelism.theme),
      },
    ],
  },
];
