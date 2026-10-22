import { expect, it } from 'vitest';
import {
  previewDesignTokensFile,
  serializeDesignTokensFile,
} from '../src/lib/design-tokens';
import { FONT_CATALOG } from '../src/lib/font-catalog';

const style = {
  fontFamily: 'google-sans',
  titleFontWeight: 650,
  bodyFontSize: 1,
  bodyFontWeight: 400,
  cardTitleSize: 1.125,
  cardTitleWeight: 600,
  contentWidth: 1600,
  pagePadding: 40,
  gridMinWidth: 224,
  gridRowGap: 16,
  gridColumnGap: 0,
  coverAspectRatio: 1,
  cardRadius: 16,
  logoShape: 'rounded',
  logoPosition: 'above',
  hoverTreatment: 'surface',
} as const;

it('imports documented Pager paths and inherited DTCG types', () => {
  const preview = previewDesignTokensFile(
    JSON.stringify({
      pager: {
        colors: {
          $type: 'color',
          accent: {
            $value: {
              colorSpace: 'srgb',
              components: [0.2, 0.4, 0.8],
            },
          },
        },
        galleryStyle: {
          $type: 'dimension',
          contentWidth: { $value: { value: 1200, unit: 'px' } },
        },
      },
    }),
  );

  expect(preview).toMatchObject({
    galleryStyle: { contentWidth: 1200 },
    colors: { accent: '#3366cc' },
    hasApplicableTokens: true,
  });
  expect(preview.recognized.map(({ path }) => path)).toEqual([
    'pager.colors.accent',
    'pager.galleryStyle.contentWidth',
  ]);
});

it('keeps token preview patches sparse so omitted settings are preserved', () => {
  const preview = previewDesignTokensFile(
    JSON.stringify({
      pager: {
        galleryStyle: {
          contentWidth: {
            $type: 'dimension',
            $value: { value: 1200, unit: 'px' },
          },
        },
      },
    }),
  );

  expect(preview.galleryStyle).toEqual({ contentWidth: 1200 });
});

it('resolves local aliases and inherited alias types', () => {
  const preview = previewDesignTokensFile(
    JSON.stringify({
      palette: {
        blue: {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [0.1, 0.2, 0.3],
          },
        },
      },
      pager: {
        colors: {
          $type: 'color',
          accent: { $value: '{palette.blue}' },
        },
        galleryStyle: {
          fontFamily: {
            $type: 'fontFamily',
            $value: ['Google Sans', 'sans-serif'],
          },
          bodyFontSize: {
            $type: 'dimension',
            $value: { value: 1.25, unit: 'rem' },
          },
          titleFontWeight: { $type: 'fontWeight', $value: 'semi-bold' },
          pagePadding: {
            $type: 'dimension',
            $value: { value: 2, unit: 'rem' },
          },
        },
      },
    }),
  );

  expect(preview).toMatchObject({
    colors: { accent: '#1a334d' },
    galleryStyle: {
      fontFamily: 'google-sans',
      bodyFontSize: 1.25,
      titleFontWeight: 600,
      pagePadding: 32,
    },
  });
});

it.each(FONT_CATALOG)(
  'imports and exports the bundled font family $name',
  (font) => {
    const preview = previewDesignTokensFile(
      JSON.stringify({
        pager: {
          galleryStyle: {
            fontFamily: { $type: 'fontFamily', $value: font.tokenFamily },
          },
        },
      }),
    );

    expect(preview.galleryStyle.fontFamily).toBe(font.id);

    const exported = JSON.parse(
      serializeDesignTokensFile({
        galleryStyle: { ...style, fontFamily: font.id },
        background: null,
        foreground: null,
        accent: '#accbfa',
        titleSize: 3,
        descriptionSize: 1.125,
        logoSize: 80,
        headerSpacing: 2.5,
        bannerPosition: 50,
      }),
    );

    expect(exported.pager.galleryStyle.fontFamily.$value).toBe(
      font.tokenFamily,
    );
  },
);

it('rejects unknown font families rather than substituting another font', () => {
  expect(() =>
    previewDesignTokensFile(
      JSON.stringify({
        pager: {
          galleryStyle: {
            fontFamily: { $type: 'fontFamily', $value: 'Arial' },
          },
        },
      }),
    ),
  ).toThrow(/fontFamily/i);
});

it('rejects token aliases whose inherited type conflicts with the source type', () => {
  expect(() =>
    previewDesignTokensFile(
      JSON.stringify({
        base: {
          width: { $type: 'number', $value: 1000 },
        },
        pager: {
          galleryStyle: {
            $type: 'dimension',
            contentWidth: { $value: '{base.width}' },
          },
        },
      }),
    ),
  ).toThrow(/references a value with a different type/i);

  expect(() =>
    previewDesignTokensFile(
      JSON.stringify({
        base: {
          width: {
            $type: 'dimension',
            $value: { value: 800, unit: 'px' },
          },
        },
        pager: {
          colors: {
            $type: 'color',
            accent: { $value: '{base.width}' },
          },
        },
      }),
    ),
  ).toThrow(/references a value with a different type/i);
});

it('resolves aliases that target a DTCG group root token', () => {
  const preview = previewDesignTokensFile(
    JSON.stringify({
      palette: {
        brand: {
          $type: 'color',
          $root: {
            $value: {
              colorSpace: 'srgb',
              components: [0.2, 0.4, 0.8],
            },
          },
        },
      },
      pager: {
        colors: {
          accent: { $type: 'color', $value: '{palette.brand.$root}' },
        },
      },
    }),
  );

  expect(preview.colors.accent).toBe('#3366cc');
});

it('resolves DTCG JSON Pointer aliases locally', () => {
  const preview = previewDesignTokensFile(
    JSON.stringify({
      palette: {
        blue: {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [0.2, 0.4, 0.8],
          },
        },
      },
      pager: {
        colors: {
          accent: { $type: 'color', $ref: '#/palette/blue/$value' },
        },
        header: {
          titleSize: {
            $type: 'dimension',
            $ref: '#/pager/header/large/$value',
          },
          large: {
            $type: 'dimension',
            $value: { value: 3.5, unit: 'rem' },
          },
        },
      },
    }),
  );

  expect(preview).toMatchObject({
    colors: { accent: '#3366cc' },
    appearance: { titleSize: 3.5 },
  });
});

it('interprets the DTCG #/ pointer as the document root', () => {
  expect(() =>
    previewDesignTokensFile(
      JSON.stringify({
        pager: {
          colors: {
            accent: { $type: 'color', $ref: '#/' },
          },
        },
      }),
    ),
  ).toThrow(/circular (json pointer|token) reference/i);
});

it('resolves local JSON Pointer references inside color and dimension values', () => {
  const preview = previewDesignTokensFile(
    JSON.stringify({
      base: {
        blue: {
          $type: 'color',
          $value: {
            colorSpace: 'srgb',
            components: [0.2, 0.4, 0.9],
          },
        },
        width: {
          $type: 'dimension',
          $value: { value: 1000, unit: 'px' },
        },
      },
      pager: {
        colors: {
          accent: {
            $type: 'color',
            $value: {
              colorSpace: 'srgb',
              components: [
                { $ref: '#/base/blue/$value/components/0' },
                { $ref: '#/base/blue/$value/components/1' },
                0.7,
              ],
            },
          },
        },
        galleryStyle: {
          contentWidth: {
            $type: 'dimension',
            $value: {
              value: { $ref: '#/base/width/$value/value' },
              unit: { $ref: '#/base/width/$value/unit' },
            },
          },
        },
      },
    }),
  );

  expect(preview).toMatchObject({
    colors: { accent: '#3366b3' },
    galleryStyle: { contentWidth: 1000 },
  });
});

it('reports unsupported paths and exposes an empty summary when nothing applies', () => {
  const preview = previewDesignTokensFile(
    JSON.stringify({
      pager: {
        galleryStyle: {
          animation: { $type: 'duration', $value: { value: 200, unit: 'ms' } },
        },
        extra: { token: { $type: 'number', $value: 3 } },
      },
    }),
  );

  expect(preview).toMatchObject({
    galleryStyle: {},
    appearance: {},
    colors: {},
    recognized: [],
    unsupported: ['pager.galleryStyle.animation', 'pager.extra.token'],
    hasApplicableTokens: false,
  });
  expect(preview.galleryStyle).toEqual({});
});

it('reports enum-only logo tokens as unsupported while applying supported tokens', () => {
  const preview = previewDesignTokensFile(
    JSON.stringify({
      pager: {
        galleryStyle: {
          logoShape: { $type: 'string', $value: 'circle' },
          logoPosition: { $type: 'string', $value: 'left' },
          contentWidth: {
            $type: 'dimension',
            $value: { value: 1200, unit: 'px' },
          },
        },
      },
    }),
  );

  expect(preview.galleryStyle).toEqual({ contentWidth: 1200 });
  expect(preview.unsupported).toEqual([
    'pager.galleryStyle.logoShape',
    'pager.galleryStyle.logoPosition',
  ]);
  expect(preview.hasApplicableTokens).toBe(true);
});

it('rejects recognized tokens that are missing a value even beside valid tokens', () => {
  expect(() =>
    previewDesignTokensFile(
      JSON.stringify({
        pager: {
          colors: {
            accent: {
              $type: 'color',
              $value: {
                colorSpace: 'srgb',
                components: [0.2, 0.4, 0.8],
              },
            },
          },
          galleryStyle: {
            contentWidth: {},
          },
        },
      }),
    ),
  ).toThrow(/pager\.galleryStyle\.contentWidth.*\$value/i);

  expect(() =>
    previewDesignTokensFile(
      JSON.stringify({ pager: { galleryStyle: { contentWidth: 1200 } } }),
    ),
  ).toThrow(/pager\.galleryStyle\.contentWidth.*token object/i);
});

it('treats inherited object property names as unsupported token paths', () => {
  const preview = previewDesignTokensFile(
    JSON.stringify({ toString: { $type: 'number', $value: 3 } }),
  );

  expect(preview.unsupported).toEqual(['toString']);
  expect(preview.hasApplicableTokens).toBe(false);
});

it('rejects DTCG group composition instead of silently omitting inherited tokens', () => {
  expect(() =>
    previewDesignTokensFile(
      JSON.stringify({
        base: { colors: { accent: { $type: 'color', $value: {} } } },
        pager: { $extends: '{base}' },
      }),
    ),
  ).toThrow(/\$extends.*not supported/i);
});

it.each([
  [
    'invalid recognized values',
    {
      pager: {
        galleryStyle: {
          $type: 'dimension',
          contentWidth: { $value: { value: 40, unit: 'em' } },
        },
      },
    },
  ],
  [
    'invalid recognized font weights',
    {
      pager: {
        galleryStyle: {
          titleFontWeight: { $type: 'fontWeight', $value: 'toString' },
        },
      },
    },
  ],
  [
    'out-of-range color components with a fallback',
    {
      pager: {
        colors: {
          accent: {
            $type: 'color',
            $value: {
              colorSpace: 'srgb',
              components: [-1, 0, 0],
              hex: '#000000',
            },
          },
        },
      },
    },
  ],
  [
    'unresolved aliases',
    {
      pager: {
        colors: {
          $type: 'color',
          accent: { $value: '{missing.token}' },
        },
      },
    },
  ],
  [
    'circular aliases',
    {
      pager: {
        galleryStyle: {
          $type: 'dimension',
          bodyFontSize: { $value: '{pager.galleryStyle.cardTitleSize}' },
          cardTitleSize: { $value: '{pager.galleryStyle.bodyFontSize}' },
        },
      },
    },
  ],
  [
    'unsupported external references',
    {
      pager: {
        colors: {
          accent: {
            $type: 'color',
            $ref: 'https://example.com/tokens.json#/blue',
          },
        },
      },
    },
  ],
  [
    'unresolved aliases in unsupported tokens',
    {
      pager: {
        galleryStyle: {
          animation: {
            $type: 'duration',
            $value: '{missing.animation}',
          },
        },
      },
    },
  ],
  [
    'circular references in unsupported tokens',
    {
      custom: {
        first: { $type: 'number', $value: '{custom.second}' },
        second: { $type: 'number', $value: '{custom.first}' },
      },
    },
  ],
  [
    'circular nested JSON Pointer references in unsupported tokens',
    {
      custom: {
        first: {
          $type: 'shadow',
          $value: { color: { $ref: '#/custom/second/$value/color' } },
        },
        second: {
          $type: 'shadow',
          $value: { color: { $ref: '#/custom/first/$value/color' } },
        },
      },
    },
  ],
  [
    'unresolved JSON pointers in unsupported tokens',
    {
      custom: {
        something: { $type: 'number', $ref: '#/missing/$value' },
      },
    },
  ],
  [
    'unresolved nested JSON Pointers in unsupported tokens',
    {
      custom: {
        shadow: {
          $type: 'shadow',
          $value: { color: { $ref: '#/missing/color/$value' } },
        },
      },
    },
  ],
])('rejects %s before a style patch can be applied', (_name, input) => {
  expect(() => previewDesignTokensFile(JSON.stringify(input))).toThrow();
});

it('enforces the 96 KiB import limit and valid JSON', () => {
  expect(() => previewDesignTokensFile(' '.repeat(96 * 1024 + 1))).toThrow(
    /too large/i,
  );
  expect(() => previewDesignTokensFile('{')).toThrow(/valid json/i);
});

it('exports concrete self-contained DTCG tokens that import back to the same settings', () => {
  const text = serializeDesignTokensFile({
    galleryStyle: style,
    titleSize: 3,
    descriptionSize: 1.125,
    logoSize: 80,
    headerSpacing: 2.5,
    bannerPosition: 50,
    background: '#101112',
    foreground: null,
    accent: '#accbfa',
  });
  const file = JSON.parse(text);

  expect(file.pager.colors.background.$value).toMatchObject({
    colorSpace: 'srgb',
    hex: '#101112',
  });
  expect(file.pager.colors).not.toHaveProperty('foreground');
  expect(file.pager.galleryStyle.contentWidth).toEqual({
    $type: 'dimension',
    $value: { value: 1600, unit: 'px' },
  });
  expect(file.pager.galleryStyle.bodyFontSize).toEqual({
    $type: 'dimension',
    $value: { value: 1, unit: 'rem' },
  });
  expect(file.pager.header.titleSize).toEqual({
    $type: 'dimension',
    $value: { value: 3, unit: 'rem' },
  });
  expect(file.pager.header.bannerPosition).toEqual({
    $type: 'number',
    $value: 50,
  });
  expect(text).not.toContain('"$ref"');
  expect(text).not.toMatch(/"\$value":\s*"\{[^}]+\}"/);
  expect(previewDesignTokensFile(text)).toMatchObject({
    galleryStyle: Object.fromEntries(
      Object.entries(style).filter(
        ([key]) =>
          !['hoverTreatment', 'logoShape', 'logoPosition'].includes(key),
      ),
    ),
    appearance: {
      titleSize: 3,
      descriptionSize: 1.125,
      logoSize: 80,
      headerSpacing: 2.5,
      bannerPosition: 50,
    },
    colors: { background: '#101112', accent: '#accbfa' },
    hasApplicableTokens: true,
  });
});
