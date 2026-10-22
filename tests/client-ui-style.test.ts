import { describe, expect, it } from 'vitest';
import {
  appearanceDefaults,
  clientUiSchema,
  DEFAULT_CLIENT_UI,
  DEFAULT_GALLERY_STYLE,
  NEW_PAGE_CLIENT_UI,
  normalizeClientUi,
  parsePageInput,
} from '../src/lib/contracts';
import { galleryStyleStylesheet } from '../src/lib/gallery-style';

describe('client UI settings', () => {
  it('starts new pages with browsing controls off and preserves the other visible content', () => {
    const page = parsePageInput({ title: 'Client page', slug: 'client-page' });

    expect(page.clientUi).toEqual(NEW_PAGE_CLIENT_UI);
    expect(page.clientUi.showBrowsingControls).toBe(false);
    expect(page.clientUi.showAlbums).toBe(true);
    expect(page.clientUi.showTitle).toBe(true);
    expect(page.galleryStyle).toEqual(DEFAULT_GALLERY_STYLE);
  });

  it('keeps browsing controls off when a new page supplies only partial visibility settings', () => {
    const page = parsePageInput({
      title: 'Partial settings',
      slug: 'partial-settings',
      clientUi: { showTitle: false },
    });

    expect(page.clientUi.showTitle).toBe(false);
    expect(page.clientUi.showBrowsingControls).toBe(false);
  });

  it('hydrates legacy records with the current visible layout', () => {
    const legacy = appearanceDefaults({ title: 'Legacy page' });

    expect(legacy.clientUi).toEqual(DEFAULT_CLIENT_UI);
    expect(legacy.galleryStyle).toEqual(DEFAULT_GALLERY_STYLE);
  });

  it('fills missing switches when a stored client UI object is partial', () => {
    expect(normalizeClientUi({ showTitle: false })).toMatchObject({
      showTitle: false,
      showBanner: true,
      showBrowsingControls: true,
      showAlbums: true,
      showAlbumCovers: true,
      showAlbumTitles: true,
      showBranding: true,
    });
  });

  it('defaults partial new-page visibility settings from the new-page baseline', () => {
    expect(clientUiSchema.parse({ showTitle: false })).toMatchObject({
      showTitle: false,
      showBrowsingControls: false,
      showAlbums: true,
      showBranding: true,
    });
  });

  it('requires visible albums to keep either their covers or titles', () => {
    expect(
      clientUiSchema.safeParse({
        ...DEFAULT_CLIENT_UI,
        showAlbumCovers: false,
        showAlbumTitles: false,
      }).success,
    ).toBe(false);

    expect(
      clientUiSchema.parse({
        ...DEFAULT_CLIENT_UI,
        showAlbums: false,
        showAlbumCovers: false,
        showAlbumTitles: false,
      }),
    ).toMatchObject({ showAlbums: false });
  });
});

describe('gallery style defaults and CSS variables', () => {
  it('uses Google Sans and the current Immich gallery geometry by default', () => {
    expect(DEFAULT_GALLERY_STYLE).toMatchObject({
      fontFamily: 'google-sans',
      contentWidth: 1600,
      pagePadding: 40,
      gridMinWidth: 224,
      gridRowGap: 16,
      gridColumnGap: 0,
      coverAspectRatio: 1,
      cardRadius: 16,
      hoverTreatment: 'surface',
    });
  });

  it('emits low-specificity scoped defaults so authored CSS can override them', () => {
    const css = galleryStyleStylesheet({
      id: 'page-1',
      theme: 'light',
      background: '#ffffff',
      foreground: null,
      accent: '#accbfa',
      alignment: 'center',
      headerLayout: 'overlay',
      headerSize: 'standard',
      logoSize: 80,
      titleSize: 3,
      descriptionSize: 1.125,
      headerSpacing: 2.5,
      bannerPosition: 50,
      banner: '/page/media/page-1/banner',
      clientUi: DEFAULT_CLIENT_UI,
      galleryStyle: DEFAULT_GALLERY_STYLE,
    });

    expect(css).toContain(':where([data-pager-gallery="page-1"])');
    expect(css).toContain('--pager-background: #ffffff');
    expect(css).toContain('--pager-font-family: "GoogleSans", sans-serif');
    expect(css).toContain('--pager-cover-aspect-ratio: 1');
    expect(css).toContain('--pager-banner-height: clamp(180px, 26vw, 360px)');
    expect(css).toContain('--pager-hero-display: grid');
    expect(css).not.toContain('--pager-header-layout:');
    expect(css).not.toContain('--pager-banner-size:');
    expect(css).not.toContain('--pager-foreground:');
    expect(css).not.toContain('!important');
  });
});
