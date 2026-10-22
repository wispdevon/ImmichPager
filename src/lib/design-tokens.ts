import { z } from 'zod';
import {
  galleryStyleSchema,
  type GalleryStyle,
  type PageInput,
} from './contracts';

export const DESIGN_TOKEN_MAX_BYTES = 96 * 1024;

type JsonObject = Record<string, unknown>;
type SupportedType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'number';
type GalleryStyleKey = keyof GalleryStyle;

type TokenRecord = {
  path: string;
  node: JsonObject;
  inheritedType: string | undefined;
  pointerSegments: string[];
};

type ResolvedToken = {
  type: string | undefined;
  value: unknown;
};

type ResolveState = {
  records: Map<string, TokenRecord>;
  recordsByPointer: Map<string, TokenRecord>;
  document: JsonObject;
  tokenStack: string[];
  pointerStack: string[];
};

export type DesignTokenRecognition = {
  path: string;
  target: string;
  value: unknown;
};

export type DesignTokenImportPreview = {
  galleryStyle: Partial<GalleryStyle>;
  appearance: Partial<
    Pick<
      PageInput,
      | 'titleSize'
      | 'descriptionSize'
      | 'logoSize'
      | 'headerSpacing'
      | 'bannerPosition'
    >
  >;
  colors: Partial<Pick<PageInput, 'background' | 'foreground' | 'accent'>>;
  recognized: DesignTokenRecognition[];
  unsupported: string[];
  hasApplicableTokens: boolean;
};

export type DesignTokenExportInput = Pick<
  PageInput,
  | 'galleryStyle'
  | 'background'
  | 'foreground'
  | 'accent'
  | 'titleSize'
  | 'descriptionSize'
  | 'logoSize'
  | 'headerSpacing'
  | 'bannerPosition'
>;

type TokenMapping =
  | {
      target: 'color';
      type: 'color';
      key: 'background' | 'foreground' | 'accent';
    }
  | { target: 'galleryStyle'; type: SupportedType; key: GalleryStyleKey }
  | {
      target: 'appearance';
      type: 'dimension' | 'number';
      key:
        | 'titleSize'
        | 'descriptionSize'
        | 'logoSize'
        | 'headerSpacing'
        | 'bannerPosition';
    };

const tokenMappings: Record<string, TokenMapping> = {
  'pager.colors.background': {
    target: 'color',
    type: 'color',
    key: 'background',
  },
  'pager.colors.foreground': {
    target: 'color',
    type: 'color',
    key: 'foreground',
  },
  'pager.colors.accent': { target: 'color', type: 'color', key: 'accent' },
  'pager.galleryStyle.fontFamily': {
    target: 'galleryStyle',
    type: 'fontFamily',
    key: 'fontFamily',
  },
  'pager.galleryStyle.titleFontWeight': {
    target: 'galleryStyle',
    type: 'fontWeight',
    key: 'titleFontWeight',
  },
  'pager.galleryStyle.bodyFontSize': {
    target: 'galleryStyle',
    type: 'dimension',
    key: 'bodyFontSize',
  },
  'pager.galleryStyle.bodyFontWeight': {
    target: 'galleryStyle',
    type: 'fontWeight',
    key: 'bodyFontWeight',
  },
  'pager.galleryStyle.cardTitleSize': {
    target: 'galleryStyle',
    type: 'dimension',
    key: 'cardTitleSize',
  },
  'pager.galleryStyle.cardTitleWeight': {
    target: 'galleryStyle',
    type: 'fontWeight',
    key: 'cardTitleWeight',
  },
  'pager.galleryStyle.contentWidth': {
    target: 'galleryStyle',
    type: 'dimension',
    key: 'contentWidth',
  },
  'pager.galleryStyle.pagePadding': {
    target: 'galleryStyle',
    type: 'dimension',
    key: 'pagePadding',
  },
  'pager.galleryStyle.gridMinWidth': {
    target: 'galleryStyle',
    type: 'dimension',
    key: 'gridMinWidth',
  },
  'pager.galleryStyle.gridRowGap': {
    target: 'galleryStyle',
    type: 'dimension',
    key: 'gridRowGap',
  },
  'pager.galleryStyle.gridColumnGap': {
    target: 'galleryStyle',
    type: 'dimension',
    key: 'gridColumnGap',
  },
  'pager.galleryStyle.coverAspectRatio': {
    target: 'galleryStyle',
    type: 'number',
    key: 'coverAspectRatio',
  },
  'pager.galleryStyle.cardRadius': {
    target: 'galleryStyle',
    type: 'dimension',
    key: 'cardRadius',
  },
  'pager.header.titleSize': {
    target: 'appearance',
    type: 'dimension',
    key: 'titleSize',
  },
  'pager.header.descriptionSize': {
    target: 'appearance',
    type: 'dimension',
    key: 'descriptionSize',
  },
  'pager.header.logoSize': {
    target: 'appearance',
    type: 'dimension',
    key: 'logoSize',
  },
  'pager.header.headerSpacing': {
    target: 'appearance',
    type: 'dimension',
    key: 'headerSpacing',
  },
  'pager.header.bannerPosition': {
    target: 'appearance',
    type: 'number',
    key: 'bannerPosition',
  },
};

const fontWeights: Record<string, number> = {
  thin: 100,
  hairline: 100,
  'extra-light': 200,
  'ultra-light': 200,
  light: 300,
  normal: 400,
  regular: 400,
  book: 400,
  medium: 500,
  'semi-bold': 600,
  'demi-bold': 600,
  bold: 700,
  'extra-bold': 800,
  'ultra-bold': 800,
  black: 900,
  heavy: 900,
  'extra-black': 950,
  'ultra-black': 950,
};

const recognizedSystemFontFamilies = new Set([
  'system',
  'system-ui',
  'ui-sans-serif',
  'sans-serif',
  '-apple-system',
  'blinkmacsystemfont',
]);

const dimensionKeys = new Set<GalleryStyleKey>([
  'contentWidth',
  'pagePadding',
  'gridMinWidth',
  'gridRowGap',
  'gridColumnGap',
  'cardRadius',
]);

const numberKeys = new Set<GalleryStyleKey>(['coverAspectRatio']);

const remDimensionKeys = new Set<GalleryStyleKey>([
  'bodyFontSize',
  'cardTitleSize',
]);

const fontWeightKeys = new Set<GalleryStyleKey>([
  'titleFontWeight',
  'bodyFontWeight',
  'cardTitleWeight',
]);

const fontFamilyKeys = new Set<GalleryStyleKey>(['fontFamily']);
const colorPattern = /^#[0-9a-f]{6}$/i;
const appearanceStyleSchema = z
  .object({
    titleSize: z.number().min(1.5).max(4).optional(),
    descriptionSize: z.number().min(0.875).max(1.5).optional(),
    logoSize: z.number().int().min(48).max(160).optional(),
    headerSpacing: z.number().min(1.5).max(5).optional(),
    bannerPosition: z.number().int().min(0).max(100).optional(),
  })
  .strict();

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertFileSize(text: string) {
  if (new TextEncoder().encode(text).byteLength > DESIGN_TOKEN_MAX_BYTES)
    throw new Error(
      'This design token file is too large. The limit is 96 KiB.',
    );
}

function parseJson(text: string): JsonObject {
  assertFileSize(text);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('This design token file is not valid JSON.');
  }
  if (!isObject(value))
    throw new Error('This design token file must contain a JSON object.');
  return value;
}

function collectTokens(document: JsonObject) {
  const records = new Map<string, TokenRecord>();
  const recordsByPointer = new Map<string, TokenRecord>();

  function pointerKey(segments: string[]) {
    return JSON.stringify(segments);
  }

  function visit(
    node: JsonObject,
    path: string,
    inheritedType: string | undefined,
    pointerSegments: string[],
  ) {
    if (Object.hasOwn(node, '$extends'))
      throw new Error(
        `DTCG group $extends at ${path || 'the document root'} is not supported.`,
      );
    const hasValue = Object.hasOwn(node, '$value');
    const hasRef = Object.hasOwn(node, '$ref');
    const tokenLike = hasValue || hasRef;
    if (Object.hasOwn(tokenMappings, path) && !tokenLike)
      throw new Error(
        `Recognized token ${path} must be a token object with $value or $ref.`,
      );
    if (tokenLike) {
      const record = { path, node, inheritedType, pointerSegments };
      records.set(path, record);
      recordsByPointer.set(pointerKey(pointerSegments), record);
      return;
    }

    const type =
      Object.hasOwn(node, '$type') && typeof node.$type === 'string'
        ? node.$type
        : inheritedType;
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$') && key !== '$root') continue;
      const childPath = path ? `${path}.${key}` : key;
      if (Object.hasOwn(tokenMappings, childPath) && !isObject(value))
        throw new Error(
          `Recognized token ${childPath} must be a token object with $value or $ref.`,
        );
      if (!isObject(value)) continue;
      visit(value, childPath, type, [...pointerSegments, key]);
    }
  }

  visit(document, '', undefined, []);
  return { records, recordsByPointer };
}

function getPointerPath(pointer: string): string[] {
  if (pointer === '#') return [];
  if (!pointer.startsWith('#/'))
    throw new Error('Only local JSON Pointer references are supported.');

  let decoded: string;
  try {
    decoded = decodeURIComponent(pointer.slice(2));
  } catch {
    throw new Error('The JSON Pointer reference is malformed.');
  }

  return decoded.split('/').map((part) => {
    if (/~(?![01])/.test(part))
      throw new Error('The JSON Pointer reference is malformed.');
    return part.replace(/~1/g, '/').replace(/~0/g, '~');
  });
}

function pointerValue(document: JsonObject, pointer: string): unknown {
  let current: unknown = document;
  for (const segment of getPointerPath(pointer)) {
    if (Array.isArray(current) && /^(0|[1-9]\d*)$/.test(segment)) {
      current = current[Number(segment)];
      continue;
    }
    if (!isObject(current) || !Object.hasOwn(current, segment))
      throw new Error(`The local reference ${pointer} cannot be resolved.`);
    current = current[segment];
  }
  if (current === undefined)
    throw new Error(`The local reference ${pointer} cannot be resolved.`);
  return current;
}

function valueAtPointerSegments(
  value: unknown,
  segments: string[],
  pointer: string,
) {
  let current = value;
  for (const segment of segments) {
    if (Array.isArray(current) && /^(0|[1-9]\d*)$/.test(segment)) {
      current = current[Number(segment)];
      continue;
    }
    if (!isObject(current) || !Object.hasOwn(current, segment))
      throw new Error(`The local reference ${pointer} cannot be resolved.`);
    current = current[segment];
  }
  if (current === undefined)
    throw new Error(`The local reference ${pointer} cannot be resolved.`);
  return current;
}

function recordForPointer(
  segments: string[],
  recordsByPointer: Map<string, TokenRecord>,
) {
  for (let length = segments.length; length >= 0; length--) {
    const record = recordsByPointer.get(
      JSON.stringify(segments.slice(0, length)),
    );
    if (record) return { record, length };
  }
  return undefined;
}

function resolveCompositeValue(value: unknown, state: ResolveState): unknown {
  if (Array.isArray(value))
    return value.map((item) => resolveCompositeValue(item, state));
  if (!isObject(value)) return value;

  if (Object.hasOwn(value, '$ref')) {
    if (typeof value.$ref !== 'string' || Object.keys(value).length !== 1)
      throw new Error('A property-level JSON Pointer reference is malformed.');
    return resolvePointerReference(value.$ref, state).value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      resolveCompositeValue(child, state),
    ]),
  );
}

function resolvePointerReference(
  pointer: string,
  state: ResolveState,
): ResolvedToken {
  if (state.pointerStack.includes(pointer))
    throw new Error(`Circular JSON Pointer reference found at ${pointer}.`);
  const nextState = {
    ...state,
    pointerStack: [...state.pointerStack, pointer],
  };
  const segments = getPointerPath(pointer);
  const match = recordForPointer(segments, state.recordsByPointer);

  if (match) {
    const { record, length } = match;
    const remainder = segments.slice(length);
    if (remainder.length === 0) return resolveToken(record, nextState);
    if (remainder[0] === '$type') {
      const resolved = resolveToken(record, nextState);
      return { type: undefined, value: resolved.type };
    }
    if (remainder[0] === '$value') {
      const valueSegments = remainder.slice(1);
      if (valueSegments.length === 0) return resolveToken(record, nextState);

      const valueReference =
        typeof record.node.$ref === 'string'
          ? record.node.$ref
          : typeof record.node.$value === 'string' &&
              /^\{[^{}]+\}$/.test(record.node.$value)
            ? record.node.$value
            : null;
      if (valueReference !== null) {
        const resolved = resolveToken(record, nextState);
        return {
          type: undefined,
          value: resolveCompositeValue(
            valueAtPointerSegments(resolved.value, valueSegments, pointer),
            nextState,
          ),
        };
      }

      return {
        type: undefined,
        value: resolveCompositeValue(
          valueAtPointerSegments(record.node.$value, valueSegments, pointer),
          nextState,
        ),
      };
    }
  }

  return {
    type: undefined,
    value: resolveCompositeValue(
      pointerValue(state.document, pointer),
      nextState,
    ),
  };
}

function resolveToken(token: TokenRecord, state: ResolveState): ResolvedToken {
  if (state.tokenStack.includes(token.path))
    throw new Error(`Circular token reference found at ${token.path}.`);
  const nextState = {
    ...state,
    tokenStack: [...state.tokenStack, token.path],
  };
  const { node } = token;

  if ('$value' in node && '$ref' in node)
    throw new Error(`Token ${token.path} cannot define both $value and $ref.`);

  const explicitType = node.$type;
  if (explicitType !== undefined && typeof explicitType !== 'string')
    throw new Error(`Token ${token.path} has an invalid $type.`);

  let value: unknown;
  let referencedType: string | undefined;
  const reference =
    typeof node.$ref === 'string'
      ? node.$ref
      : typeof node.$value === 'string' && /^\{[^{}]+\}$/.test(node.$value)
        ? node.$value
        : null;

  if (node.$ref !== undefined && typeof node.$ref !== 'string')
    throw new Error(`Token ${token.path} has an invalid $ref.`);

  if (reference !== null) {
    let target: ResolvedToken;
    if (reference.startsWith('{') && reference.endsWith('}')) {
      const targetPath = reference.slice(1, -1);
      const targetToken = state.records.get(targetPath);
      if (!targetToken)
        throw new Error(
          `The token reference {${targetPath}} from ${token.path} cannot be resolved.`,
        );
      target = resolveToken(targetToken, nextState);
    } else {
      target = resolvePointerReference(reference, nextState);
    }
    value = target.value;
    referencedType = target.type;
  } else if ('$ref' in node) {
    throw new Error(`Token ${token.path} has an invalid $ref.`);
  } else if ('$value' in node) {
    value = resolveCompositeValue(node.$value, nextState);
  } else {
    throw new Error(`Token ${token.path} has no $value.`);
  }

  if (
    typeof explicitType === 'string' &&
    referencedType !== undefined &&
    explicitType !== referencedType
  )
    throw new Error(
      `Token ${token.path} references a value with a different type.`,
    );

  if (
    typeof explicitType !== 'string' &&
    token.inheritedType !== undefined &&
    referencedType !== undefined &&
    token.inheritedType !== referencedType
  )
    throw new Error(
      `Token ${token.path} references a value with a different type from its inherited group type.`,
    );

  const type =
    typeof explicitType === 'string'
      ? explicitType
      : (token.inheritedType ?? referencedType);
  if (type === undefined)
    throw new Error(`Token ${token.path} has no explicit or inherited type.`);

  return { type, value };
}

function containsPropertyReference(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsPropertyReference);
  if (!isObject(value)) return false;
  if (Object.hasOwn(value, '$ref')) return true;
  return Object.values(value).some(containsPropertyReference);
}

function validateColorValue(value: unknown, path: string): string {
  if (!isObject(value))
    throw new Error(`Token ${path} is not a DTCG color value.`);
  const colorSpace = value.colorSpace;
  const components = value.components;
  if (typeof colorSpace !== 'string' || !Array.isArray(components))
    throw new Error(`Token ${path} is not a DTCG color value.`);

  const componentCounts: Record<string, number> = {
    srgb: 3,
    'srgb-linear': 3,
    hsl: 3,
    hwb: 3,
    lab: 3,
    lch: 3,
    oklab: 3,
    oklch: 3,
    'display-p3': 3,
    'a98-rgb': 3,
    'prophoto-rgb': 3,
    rec2020: 3,
    'xyz-d65': 3,
    'xyz-d50': 3,
  };
  const expectedCount = componentCounts[colorSpace];
  if (!expectedCount || components.length !== expectedCount)
    throw new Error(`Token ${path} uses an unsupported DTCG color space.`);
  if (
    components.some(
      (component) =>
        component !== 'none' &&
        (typeof component !== 'number' || !Number.isFinite(component)),
    )
  )
    throw new Error(`Token ${path} has invalid color components.`);

  const numeric = components as Array<number | 'none'>;
  validateColorComponentRanges(colorSpace, numeric, path);

  const alpha = value.alpha === undefined ? 1 : value.alpha;
  if (
    typeof alpha !== 'number' ||
    !Number.isFinite(alpha) ||
    alpha < 0 ||
    alpha > 1
  )
    throw new Error(`Token ${path} has an invalid color alpha.`);
  if (alpha !== 1)
    throw new Error(
      `Token ${path} is translucent; Pager colors require opaque sRGB.`,
    );

  if (value.hex !== undefined) {
    if (typeof value.hex !== 'string' || !colorPattern.test(value.hex))
      throw new Error(`Token ${path} has an invalid six-digit hex fallback.`);
    return value.hex.toLowerCase();
  }

  if (numeric.includes('none'))
    throw new Error(`Token ${path} cannot be normalized to an sRGB hex color.`);

  if (colorSpace === 'srgb' || colorSpace === 'srgb-linear') {
    const channels = numeric as number[];
    if (channels.some((channel) => channel < 0 || channel > 1))
      throw new Error(`Token ${path} has out-of-range sRGB components.`);
    const encoded =
      colorSpace === 'srgb'
        ? channels
        : channels.map((channel) =>
            channel <= 0.0031308
              ? 12.92 * channel
              : 1.055 * channel ** (1 / 2.4) - 0.055,
          );
    return hexFromRgb(encoded);
  }

  if (colorSpace === 'hsl') {
    const [hue, saturation, lightness] = numeric as number[];
    if (
      hue < 0 ||
      hue >= 360 ||
      saturation < 0 ||
      saturation > 100 ||
      lightness < 0 ||
      lightness > 100
    )
      throw new Error(`Token ${path} has out-of-range HSL components.`);
    return hexFromRgb(hslToRgb(hue, saturation / 100, lightness / 100));
  }

  if (colorSpace === 'hwb') {
    const [hue, whiteness, blackness] = numeric as number[];
    if (
      hue < 0 ||
      hue >= 360 ||
      whiteness < 0 ||
      whiteness > 100 ||
      blackness < 0 ||
      blackness > 100
    )
      throw new Error(`Token ${path} has out-of-range HWB components.`);
    return hexFromRgb(hwbToRgb(hue, whiteness / 100, blackness / 100));
  }

  throw new Error(
    `Token ${path} uses ${colorSpace}; include a six-digit DTCG hex fallback to import it.`,
  );
}

function validateColorComponentRanges(
  colorSpace: string,
  components: Array<number | 'none'>,
  path: string,
) {
  const ranges: Record<
    string,
    Array<[min: number, max: number, exclusiveMax?: boolean]>
  > = {
    srgb: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    'srgb-linear': [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    hsl: [
      [0, 360, true],
      [0, 100],
      [0, 100],
    ],
    hwb: [
      [0, 360, true],
      [0, 100],
      [0, 100],
    ],
    lab: [
      [0, 100],
      [-Infinity, Infinity],
      [-Infinity, Infinity],
    ],
    lch: [
      [0, 100],
      [0, Infinity],
      [0, 360, true],
    ],
    oklab: [
      [0, 1],
      [-Infinity, Infinity],
      [-Infinity, Infinity],
    ],
    oklch: [
      [0, 1],
      [0, Infinity],
      [0, 360, true],
    ],
    'display-p3': [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    'a98-rgb': [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    'prophoto-rgb': [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    rec2020: [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    'xyz-d65': [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
    'xyz-d50': [
      [0, 1],
      [0, 1],
      [0, 1],
    ],
  };
  const expectedRanges = ranges[colorSpace];
  if (!expectedRanges) return;

  const outOfRange = components.some((component, index) => {
    if (component === 'none') return false;
    const [min, max, exclusiveMax] = expectedRanges[index];
    return (
      component < min || (exclusiveMax ? component >= max : component > max)
    );
  });
  if (outOfRange)
    throw new Error(`Token ${path} has out-of-range ${colorSpace} components.`);
}

function hexFromRgb(channels: number[]): string {
  return `#${channels
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel * 255)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hueSector = hue / 60;
  const x = chroma * (1 - Math.abs((hueSector % 2) - 1));
  const match = lightness - chroma / 2;
  const sector = Math.floor(hueSector);
  const channels =
    sector === 0
      ? [chroma, x, 0]
      : sector === 1
        ? [x, chroma, 0]
        : sector === 2
          ? [0, chroma, x]
          : sector === 3
            ? [0, x, chroma]
            : sector === 4
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return channels.map((channel) => channel + match);
}

function hwbToRgb(hue: number, whiteness: number, blackness: number) {
  const sum = whiteness + blackness;
  if (sum >= 1) {
    const gray = whiteness / sum;
    return [gray, gray, gray];
  }
  const pureHue = hslToRgb(hue, 1, 0.5);
  return pureHue.map((channel) => channel * (1 - sum) + whiteness);
}

function normalizeFontFamily(
  value: unknown,
  path: string,
): GalleryStyle['fontFamily'] {
  const families = Array.isArray(value) ? value : [value];
  if (
    !families.length ||
    families.some((family) => typeof family !== 'string' || !family.trim())
  )
    throw new Error(`Token ${path} has an invalid fontFamily value.`);

  const first = (families[0] as string).trim().toLowerCase();
  if (first === 'google sans' || first === 'google-sans') return 'google-sans';
  if (recognizedSystemFontFamilies.has(first)) return 'system';
  throw new Error(
    `Token ${path} must use Google Sans or a supported system font stack.`,
  );
}

function normalizeFontWeight(value: unknown, path: string) {
  const weight =
    typeof value === 'string'
      ? Object.hasOwn(fontWeights, value)
        ? fontWeights[value]
        : undefined
      : typeof value === 'number' && Number.isFinite(value)
        ? value
        : undefined;
  if (weight === undefined || weight < 1 || weight > 1000)
    throw new Error(`Token ${path} has an invalid DTCG fontWeight value.`);
  return weight;
}

function normalizeDimension(
  value: unknown,
  path: string,
  targetUnit: 'px' | 'rem',
) {
  if (
    !isObject(value) ||
    typeof value.value !== 'number' ||
    !Number.isFinite(value.value) ||
    (value.unit !== 'px' && value.unit !== 'rem')
  )
    throw new Error(`Token ${path} has an invalid DTCG dimension value.`);
  const converted =
    targetUnit === value.unit
      ? value.value
      : targetUnit === 'px'
        ? value.value * 16
        : value.value / 16;
  if (targetUnit === 'px' && !Number.isInteger(converted))
    throw new Error(`Token ${path} must resolve to a whole pixel value.`);
  return converted;
}

function normalizeMappedValue(
  mapping: TokenMapping,
  resolved: ResolvedToken,
  path: string,
): unknown {
  if (resolved.type !== mapping.type)
    throw new Error(
      `Token ${path} needs DTCG type ${mapping.type}, but declares ${resolved.type ?? 'no type'}.`,
    );

  if (mapping.target === 'color')
    return validateColorValue(resolved.value, path);

  let value = resolved.value;
  const key = mapping.key;
  if (mapping.type === 'dimension') {
    let targetUnit: 'px' | 'rem' | undefined;
    if (mapping.target === 'appearance') {
      targetUnit = key === 'logoSize' ? 'px' : 'rem';
    } else if (dimensionKeys.has(key as GalleryStyleKey)) {
      targetUnit = 'px';
    } else if (remDimensionKeys.has(key as GalleryStyleKey)) {
      targetUnit = 'rem';
    }
    if (targetUnit === undefined)
      throw new Error(`Token ${path} has no supported dimension mapping.`);
    value = normalizeDimension(value, path, targetUnit);
  } else if (fontWeightKeys.has(key as GalleryStyleKey)) {
    value = normalizeFontWeight(value, path);
  } else if (fontFamilyKeys.has(key as GalleryStyleKey)) {
    value = normalizeFontFamily(value, path);
  } else if (
    numberKeys.has(key as GalleryStyleKey) ||
    (mapping.target === 'appearance' && key === 'bannerPosition')
  ) {
    if (typeof value !== 'number' || !Number.isFinite(value))
      throw new Error(`Token ${path} must contain a finite number.`);
  } else {
    throw new Error(`Token ${path} has no supported Pager mapping.`);
  }

  return value;
}

function validateGalleryStylePatch(value: Record<string, unknown>) {
  const result = galleryStyleSchema.partial().safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.') || 'galleryStyle';
    throw new Error(
      `Invalid Pager galleryStyle.${path}: ${issue?.message ?? 'value rejected'}.`,
    );
  }
  return result.data;
}

function validateAppearancePatch(value: Record<string, unknown>) {
  const result = appearanceStyleSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.') || 'appearance';
    throw new Error(
      `Invalid Pager appearance.${path}: ${issue?.message ?? 'value rejected'}.`,
    );
  }
  return result.data;
}

export function previewDesignTokensFile(
  text: string,
): DesignTokenImportPreview {
  const document = parseJson(text);
  const { records, recordsByPointer } = collectTokens(document);
  const resolution: ResolveState = {
    records,
    recordsByPointer,
    document,
    tokenStack: [],
    pointerStack: [],
  };
  const galleryStyle: Record<string, unknown> = {};
  const appearance: Record<string, unknown> = {};
  const colors: DesignTokenImportPreview['colors'] = {};
  const recognized: DesignTokenRecognition[] = [];
  const unsupported: string[] = [];

  for (const [path, token] of records) {
    if (!Object.hasOwn(tokenMappings, path)) {
      const hasReference =
        Object.hasOwn(token.node, '$ref') ||
        (typeof token.node.$value === 'string' &&
          /^\{[^{}]+\}$/.test(token.node.$value)) ||
        containsPropertyReference(token.node.$value);
      if (hasReference) {
        try {
          resolveToken(token, resolution);
        } catch (cause) {
          const detail =
            cause instanceof Error ? cause.message : 'reference rejected';
          throw new Error(`Invalid token reference ${path}: ${detail}`);
        }
      }
      unsupported.push(path);
      continue;
    }
    const mapping = tokenMappings[path];

    try {
      const resolved = resolveToken(token, resolution);
      const value = normalizeMappedValue(mapping, resolved, path);
      const target =
        mapping.target === 'color'
          ? mapping.key
          : `${mapping.target}.${mapping.key}`;
      if (mapping.target === 'color') {
        (colors as Record<string, unknown>)[mapping.key] = value;
      } else if (mapping.target === 'galleryStyle') {
        galleryStyle[mapping.key] = value;
      } else {
        // The exported PageInput styling fields live alongside galleryStyle.
        appearance[mapping.key] = value;
      }
      recognized.push({ path, target, value });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : 'value rejected';
      throw new Error(`Invalid recognized token ${path}: ${detail}`);
    }
  }

  const parsedGalleryStyle = validateGalleryStylePatch(galleryStyle);
  const parsedAppearance = validateAppearancePatch(appearance);
  return {
    galleryStyle: parsedGalleryStyle,
    appearance: parsedAppearance,
    colors,
    recognized,
    unsupported,
    hasApplicableTokens: recognized.length > 0,
  };
}

function token(type: SupportedType, value: unknown) {
  return { $type: type, $value: value };
}

function colorToken(value: string) {
  const hex = value.toLowerCase();
  return token('color', {
    colorSpace: 'srgb',
    components: [
      Number.parseInt(hex.slice(1, 3), 16) / 255,
      Number.parseInt(hex.slice(3, 5), 16) / 255,
      Number.parseInt(hex.slice(5, 7), 16) / 255,
    ],
    hex,
  });
}

function exportStyleValue(key: GalleryStyleKey, style: GalleryStyle) {
  const value = style[key];
  if (dimensionKeys.has(key)) return token('dimension', { value, unit: 'px' });
  if (remDimensionKeys.has(key))
    return token('dimension', { value, unit: 'rem' });
  if (fontWeightKeys.has(key)) return token('fontWeight', value);
  if (fontFamilyKeys.has(key))
    return token(
      'fontFamily',
      value === 'google-sans' ? 'Google Sans' : 'system-ui',
    );
  if (numberKeys.has(key)) return token('number', value);
  return null;
}

export function serializeDesignTokensFile(
  input: DesignTokenExportInput,
): string {
  const style = galleryStyleSchema.parse(input.galleryStyle);
  const appearance = appearanceStyleSchema.parse({
    titleSize: input.titleSize,
    descriptionSize: input.descriptionSize,
    logoSize: input.logoSize,
    headerSpacing: input.headerSpacing,
    bannerPosition: input.bannerPosition,
  });
  if (!colorPattern.test(input.accent))
    throw new Error('Pager accent must be a six-digit hex color.');
  if (input.background !== null && !colorPattern.test(input.background))
    throw new Error('Pager background must be a six-digit hex color or null.');
  if (input.foreground !== null && !colorPattern.test(input.foreground))
    throw new Error('Pager foreground must be a six-digit hex color or null.');

  const colors: JsonObject = { accent: colorToken(input.accent) };
  if (input.background !== null)
    colors.background = colorToken(input.background);
  if (input.foreground !== null)
    colors.foreground = colorToken(input.foreground);

  const galleryStyle: JsonObject = {};
  for (const key of Object.keys(style) as GalleryStyleKey[]) {
    const output = exportStyleValue(key, style);
    if (output) galleryStyle[key] = output;
  }

  const header: JsonObject = {
    titleSize: token('dimension', { value: appearance.titleSize, unit: 'rem' }),
    descriptionSize: token('dimension', {
      value: appearance.descriptionSize,
      unit: 'rem',
    }),
    logoSize: token('dimension', { value: appearance.logoSize, unit: 'px' }),
    headerSpacing: token('dimension', {
      value: appearance.headerSpacing,
      unit: 'rem',
    }),
    bannerPosition: token('number', appearance.bannerPosition),
  };

  const text = `${JSON.stringify(
    {
      pager: { colors, galleryStyle, header },
    },
    null,
    2,
  )}\n`;
  assertFileSize(text);
  return text;
}
