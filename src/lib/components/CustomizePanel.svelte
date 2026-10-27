<script lang="ts">
  import {
    customizationDefaults,
    resetClientUiValue,
  } from '$lib/customization';
  import ResetField from './ResetField.svelte';
  import ThemePanel from './ThemePanel.svelte';
  import type { ThemePreviewActions } from '$lib/theme-preview';
  import { themePalette } from '$lib/themes';
  import { mdiRestore } from '@mdi/js';
  import { tick, onMount } from 'svelte';
  import { Button, Field, Select, Switch, Input, Textarea } from '@immich/ui';
  import {
    APPEARANCE_FILE_MAX_BYTES,
    applyAppearanceSettings,
    parseAppearanceFile,
    serializeAppearanceFile,
    type AppearanceSettings,
  } from '$lib/appearance-file';
  import {
    type ClientUi,
    type GalleryStyle,
    type PageInput,
    type DraftEditorPage,
  } from '$lib/contracts';
  import {
    applyHeaderPreset,
    type HeaderPreset,
  } from '$lib/appearance-presets';
  import { compileCustomCss, CUSTOM_CSS_LIMIT } from '$lib/custom-css';
  import {
    previewDesignTokensFile,
    serializeDesignTokensFile,
  } from '$lib/design-tokens';
  import { FONT_CATALOG } from '$lib/font-catalog';
  import HeaderPresetPicker from './HeaderPresetPicker.svelte';
  import CodeMirrorCssEditor from './CodeMirrorCssEditor.svelte';

  type Tab = 'Design' | 'Elements' | 'Themes' | 'CSS';

  let {
    fields = $bindable(),
    themeUndo = $bindable<PageInput | null>(null),
    saved,
    busy = false,
    onTitleInput,
    onResetAll,
    onThemePreview = () => {},
  }: {
    fields: PageInput;
    themeUndo?: PageInput | null;
    saved: DraftEditorPage | null;
    busy?: boolean;
    onTitleInput: (value: string) => void;
    onResetAll: () => void;
    onThemePreview?: (
      page: PageInput | null,
      actions?: ThemePreviewActions,
    ) => void;
  } = $props();

  const defaults = $derived({
    ...customizationDefaults,
    ...fields.pageTheme?.definition.design,
    theme:
      fields.pageTheme && !fields.pageTheme.definition.variants.dark
        ? ('light' as const)
        : customizationDefaults.theme,
  });
  let preferredMode = $state<'light' | 'dark'>('dark');
  onMount(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => (preferredMode = media.matches ? 'dark' : 'light');
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  });
  const currentPalette = $derived(
    themePalette(fields, fields.theme === 'system' ? preferredMode : undefined),
  );
  function paletteInput(
    role: 'background' | 'foreground' | 'primary',
    value: string,
  ) {
    if (fields.pageTheme) {
      fields.pageTheme = {
        ...fields.pageTheme,
        overrides: { ...fields.pageTheme.overrides, [role]: value },
      };
      if (role === 'primary') fields.accent = customizationDefaults.accent;
      else fields[role] = null;
    } else if (role === 'primary') fields.accent = value;
    else fields[role] = value;
  }
  function resetPalette(role: 'background' | 'foreground' | 'primary') {
    if (fields.pageTheme) {
      const overrides = { ...fields.pageTheme.overrides };
      delete overrides[role];
      fields.pageTheme = { ...fields.pageTheme, overrides };
    }
    if (role === 'primary') fields.accent = customizationDefaults.accent;
    else fields[role] = null;
  }
  let root: HTMLElement;
  let activeTab = $state<Tab>('Design');
  let appearanceFileError = $state('');
  let appearanceFileStatus = $state('');
  let tokenFileError = $state('');
  let tokenFileStatus = $state('');
  let tokenPreview = $state<ReturnType<typeof previewDesignTokensFile> | null>(
    null,
  );
  let cssExampleStatus = $state('');
  const tabs: Tab[] = ['Design', 'Elements', 'Themes', 'CSS'];
  const cssValidation = $derived(
    compileCustomCss(fields.customCss, saved?.id ?? 'preview'),
  );
  const bannerCropPreview = $derived(
    saved?.banner ? `/page/media/${saved.id}/branding/banner?preview=1` : null,
  );

  function activateTab(tab: Tab, focus = false) {
    activeTab = tab;
    if (focus)
      void tick().then(() => {
        root?.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`)?.focus();
      });
  }

  function handleTabKeydown(event: KeyboardEvent, current: Tab) {
    const index = tabs.indexOf(current);
    let next: Tab | undefined;
    if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    else if (event.key === 'ArrowLeft')
      next = tabs[(index - 1 + tabs.length) % tabs.length];
    else if (event.key === 'Home') next = tabs[0];
    else if (event.key === 'End') next = tabs.at(-1);
    if (!next) return;
    event.preventDefault();
    activateTab(next, true);
  }

  function changeClientUi(key: keyof ClientUi, checked: boolean) {
    fields.clientUi = { ...fields.clientUi, [key]: checked };
  }

  function changeGalleryStyle<K extends keyof GalleryStyle>(
    key: K,
    value: GalleryStyle[K],
  ) {
    fields.galleryStyle = { ...fields.galleryStyle, [key]: value };
  }

  function currentAppearance(): AppearanceSettings {
    return {
      theme: fields.theme,
      pageTheme: fields.pageTheme,
      background: fields.background,
      foreground: fields.foreground,
      accent: fields.accent,
      alignment: fields.alignment,
      bannerPosition: fields.bannerPosition,
      headerLayout: fields.headerLayout,
      headerSize: fields.headerSize,
      bannerHeight: fields.bannerHeight,
      logoSize: fields.logoSize,
      titleSize: fields.titleSize,
      descriptionSize: fields.descriptionSize,
      headerSpacing: fields.headerSpacing,
      clientUi: fields.clientUi,
      galleryStyle: fields.galleryStyle,
      customCss: fields.customCss,
    };
  }

  function downloadFile(content: string, filename: string) {
    const file = new Blob([content], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportAppearance() {
    appearanceFileError = '';
    appearanceFileStatus = '';
    try {
      downloadFile(
        serializeAppearanceFile(currentAppearance()),
        'immichpager-appearance.json',
      );
      appearanceFileStatus = 'Appearance file downloaded.';
    } catch (cause) {
      appearanceFileError =
        cause instanceof Error ? cause.message : 'Could not export appearance.';
    }
  }

  async function importAppearance(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    appearanceFileError = '';
    appearanceFileStatus = '';
    try {
      if (file.size > APPEARANCE_FILE_MAX_BYTES)
        throw new Error('This appearance file is too large.');
      const imported = parseAppearanceFile(
        await file.text(),
        currentAppearance(),
      );
      fields = applyAppearanceSettings($state.snapshot(fields), imported);
      appearanceFileStatus =
        'Appearance imported into this private draft. Publish when you are ready to share it.';
    } catch (cause) {
      appearanceFileError =
        cause instanceof Error ? cause.message : 'Could not import appearance.';
    } finally {
      input.value = '';
    }
  }

  function exportTokens() {
    tokenFileError = '';
    tokenFileStatus = '';
    try {
      downloadFile(
        serializeDesignTokensFile({
          galleryStyle: fields.galleryStyle,
          background: fields.background,
          foreground: fields.foreground,
          accent: fields.accent,
          titleSize: fields.titleSize,
          descriptionSize: fields.descriptionSize,
          logoSize: fields.logoSize,
          headerSpacing: fields.headerSpacing,
          bannerPosition: fields.bannerPosition,
        }),
        'immichpager-theme.tokens.json',
      );
      tokenFileStatus = 'Design tokens downloaded.';
    } catch (cause) {
      tokenFileError =
        cause instanceof Error ? cause.message : 'Could not export tokens.';
    }
  }

  async function previewTokens(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    tokenFileError = '';
    tokenFileStatus = '';
    tokenPreview = null;
    try {
      if (file.size > APPEARANCE_FILE_MAX_BYTES)
        throw new Error('This token file is too large.');
      tokenPreview = previewDesignTokensFile(await file.text());
    } catch (cause) {
      tokenFileError =
        cause instanceof Error
          ? cause.message
          : 'Could not read design tokens.';
    } finally {
      input.value = '';
    }
  }

  function applyTokens() {
    const imported = tokenPreview;
    if (!imported?.hasApplicableTokens) return;
    fields.galleryStyle = {
      ...fields.galleryStyle,
      ...imported.galleryStyle,
    };
    Object.assign(fields, imported.appearance);
    if (Object.hasOwn(imported.colors, 'background'))
      fields.background = imported.colors.background ?? null;
    if (Object.hasOwn(imported.colors, 'foreground'))
      fields.foreground = imported.colors.foreground ?? null;
    if (imported.colors.accent) fields.accent = imported.colors.accent;
    tokenFileStatus =
      'Design tokens applied to this private draft. Visibility and custom CSS are unchanged.';
  }

  function applyPreset(preset: HeaderPreset) {
    fields = applyHeaderPreset(fields, preset);
  }

  function bannerCropDrag(node: HTMLDivElement) {
    let drag: {
      pointerId: number;
      startY: number;
      startPosition: number;
      overflowY: number;
    } | null = null;

    function start(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0) return;
      const image = node.querySelector('img');
      if (!image?.naturalWidth || !image.naturalHeight) return;

      const scale = Math.max(
        node.clientWidth / image.naturalWidth,
        node.clientHeight / image.naturalHeight,
      );
      const overflowY = image.naturalHeight * scale - node.clientHeight;
      if (overflowY <= 0) return;

      drag = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startPosition: fields.bannerPosition,
        overflowY,
      };
      node.setPointerCapture(event.pointerId);
      node.classList.add('dragging');
      event.preventDefault();
    }

    function move(event: PointerEvent) {
      if (drag?.pointerId !== event.pointerId) return;
      const position =
        drag.startPosition -
        ((event.clientY - drag.startY) / drag.overflowY) * 100;
      fields.bannerPosition = Math.max(0, Math.min(100, Math.round(position)));
    }

    function stop(event: PointerEvent) {
      if (drag?.pointerId !== event.pointerId) return;
      drag = null;
      node.classList.remove('dragging');
    }

    node.addEventListener('pointerdown', start);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', stop);
    node.addEventListener('pointercancel', stop);
    node.addEventListener('lostpointercapture', stop);

    return {
      destroy() {
        node.removeEventListener('pointerdown', start);
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', stop);
        node.removeEventListener('pointercancel', stop);
        node.removeEventListener('lostpointercapture', stop);
      },
    };
  }
</script>

<section class="customize-panel" bind:this={root} tabindex="-1">
  <div class="panel-heading">
    <h1 id="customize-heading">Customize</h1>
    <Button
      variant="ghost"
      size="small"
      leadingIcon={mdiRestore}
      disabled={busy}
      aria-label="Reset all customization"
      title="Reset all customization"
      onclick={onResetAll}
    />
  </div>

  <div class="tab-list" role="tablist" aria-label="Page customization">
    {#each tabs as tab (tab)}
      <button
        type="button"
        role="tab"
        id={`customize-tab-${tab.toLowerCase()}`}
        data-tab={tab}
        aria-selected={activeTab === tab}
        aria-controls={`customize-panel-${tab.toLowerCase()}`}
        tabindex={activeTab === tab ? 0 : -1}
        onclick={() => activateTab(tab)}
        onkeydown={(event) => handleTabKeydown(event, tab)}
      >
        {tab}
      </button>
    {/each}
  </div>

  {#if activeTab === 'Design'}
    <div
      class="tab-panel design-panel"
      id="customize-panel-design"
      role="tabpanel"
      aria-labelledby="customize-tab-design"
      tabindex="0"
    >
      <ResetField
        value={fields.bannerHeight}
        defaultValue={defaults.bannerHeight}
        label="Banner height"
        disabled={busy}
        onreset={() => (fields.bannerHeight = defaults.bannerHeight)}
      >
        <label class="canvas-height-control"
          >Banner height {fields.bannerHeight
            ? `${fields.bannerHeight}px`
            : '(preset)'}<input
            aria-label="Banner height"
            type="range"
            min="140"
            max="900"
            step="10"
            value={fields.bannerHeight ?? 360}
            oninput={(e) =>
              (fields.bannerHeight = Number(e.currentTarget.value))}
          /></label
        >
      </ResetField>
      <p class="hint">
        Click the title or description in the preview to edit your draft.
      </p>
      {#if !fields.clientUi.showTitle || !fields.clientUi.showDescription}
        <section>
          <h2>Hidden text</h2>
          <p class="hint">
            Edit hidden content here, or show it in Elements to edit it in the
            preview.
          </p>
          {#if !fields.clientUi.showTitle}
            <Field label="Title"
              ><Input
                maxlength={160}
                value={fields.title}
                oninput={(event) => onTitleInput(event.currentTarget.value)}
              /></Field
            >
          {/if}
          {#if !fields.clientUi.showDescription}
            <Field label="Description"
              ><Textarea
                maxlength={2000}
                rows={3}
                bind:value={fields.description}
              /></Field
            >
          {/if}
        </section>
      {/if}
      <section>
        <h2>Header</h2>
        {#if !fields.pageTheme || fields.pageTheme.definition.layout === 'classic'}<HeaderPresetPicker
            {fields}
            onSelect={applyPreset}
          />{:else}<p class="hint">
            {fields.pageTheme.definition.name} controls this header composition.
            Size, crop, and typography remain adjustable below.
          </p>{/if}
        {#if !fields.pageTheme || fields.pageTheme.definition.layout === 'classic'}<p
            class="hint"
          >
            Choose a starting layout. Presets change header composition only.
          </p>{/if}
      </section>
      <section>
        <h2>Logo</h2>
        <ResetField
          value={fields.galleryStyle.logoShape}
          defaultValue={defaults.galleryStyle.logoShape}
          label="Logo shape"
          disabled={busy}
          onreset={() =>
            (fields.galleryStyle.logoShape = defaults.galleryStyle.logoShape)}
        >
          <Field label="Logo shape"
            ><Select
              bind:value={fields.galleryStyle.logoShape}
              options={[
                { value: 'square', label: 'Square' },
                { value: 'rounded', label: 'Rounded' },
                { value: 'circle', label: 'Circle' },
              ]}
            /></Field
          >
        </ResetField>
        <ResetField
          value={fields.galleryStyle.logoPosition}
          defaultValue={defaults.galleryStyle.logoPosition}
          label="Logo position"
          disabled={busy}
          onreset={() =>
            (fields.galleryStyle.logoPosition =
              defaults.galleryStyle.logoPosition)}
        >
          <Field label="Logo position"
            ><Select
              bind:value={fields.galleryStyle.logoPosition}
              options={[
                { value: 'above', label: 'Above title' },
                { value: 'left', label: 'Left of title' },
              ]}
            /></Field
          >
        </ResetField>
        <ResetField
          value={fields.logoSize}
          defaultValue={defaults.logoSize}
          label="Logo size"
          disabled={busy}
          onreset={() => (fields.logoSize = defaults.logoSize)}
        >
          <label class="range-setting">
            Logo size
            <div class="range-control">
              <input
                type="range"
                min="48"
                max="160"
                step="8"
                aria-label="Logo size"
                bind:value={fields.logoSize}
              />
              <output>{fields.logoSize}px</output>
            </div>
          </label>
        </ResetField>
      </section>
      <section>
        <h2>Font</h2>
        <ResetField
          value={fields.galleryStyle.fontFamily}
          defaultValue={defaults.galleryStyle.fontFamily}
          label="Font family"
          disabled={busy}
          onreset={() =>
            (fields.galleryStyle.fontFamily = defaults.galleryStyle.fontFamily)}
        >
          <Field label="Font family"
            ><Select
              bind:value={fields.galleryStyle.fontFamily}
              options={FONT_CATALOG.map((font) => ({
                value: font.id,
                label: font.name,
              }))}
            /></Field
          >
        </ResetField>
        {#if fields.pageTheme}
          <ResetField
            value={fields.pageTheme.headingFont ??
              fields.pageTheme.definition.headingFont}
            defaultValue={fields.pageTheme.definition.headingFont}
            label="Heading font"
            disabled={busy}
            onreset={() => {
              if (fields.pageTheme)
                fields.pageTheme = {
                  ...fields.pageTheme,
                  headingFont: undefined,
                };
            }}
          >
            <Field label="Heading font"
              ><Select
                value={fields.pageTheme.headingFont ??
                  fields.pageTheme.definition.headingFont}
                options={FONT_CATALOG.map((f) => ({
                  value: f.id,
                  label: f.name,
                }))}
                onChange={(value) => {
                  if (fields.pageTheme)
                    fields.pageTheme = {
                      ...fields.pageTheme,
                      headingFont:
                        value as typeof fields.pageTheme.definition.headingFont,
                    };
                }}
              /></Field
            >
          </ResetField>
        {/if}
        <p class="hint">
          Fonts are bundled locally. System uses the fonts installed on each
          visitor’s device.
        </p>
      </section>
      <section>
        <h2>Appearance</h2>
        <ResetField
          value={fields.theme}
          defaultValue={defaults.theme}
          label="Appearance"
          disabled={busy}
          onreset={() => (fields.theme = defaults.theme)}
        >
          <Field label="Appearance">
            <Select
              bind:value={fields.theme}
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
                { value: 'system', label: 'System' },
              ].filter(
                (option) =>
                  !fields.pageTheme ||
                  (option.value === 'system'
                    ? !!fields.pageTheme.definition.variants.light &&
                      !!fields.pageTheme.definition.variants.dark
                    : !!fields.pageTheme.definition.variants[
                        option.value as 'light' | 'dark'
                      ]),
              )}
            />
          </Field>
        </ResetField>
        <div class="color-row">
          <ResetField
            value={fields.pageTheme?.overrides.background ?? fields.background}
            defaultValue={defaults.background}
            label="Background color"
            disabled={busy}
            onreset={() => resetPalette('background')}
          >
            <label class="color-setting">
              Background
              <input
                type="color"
                aria-label="Background color"
                value={currentPalette?.background.slice(0, 7) ??
                  fields.background ??
                  (fields.theme === 'light' ? '#ffffff' : '#000000')}
                oninput={(event) =>
                  paletteInput('background', event.currentTarget.value)}
              />
            </label>
          </ResetField>
          <ResetField
            value={fields.pageTheme?.overrides.foreground ?? fields.foreground}
            defaultValue={defaults.foreground}
            label="Text color"
            disabled={busy}
            onreset={() => resetPalette('foreground')}
          >
            <label class="color-setting">
              Text
              <input
                type="color"
                aria-label="Text color"
                value={currentPalette?.foreground.slice(0, 7) ??
                  fields.foreground ??
                  (fields.theme === 'light' ? '#191919' : '#e5e7eb')}
                oninput={(event) =>
                  paletteInput('foreground', event.currentTarget.value)}
              />
            </label>
          </ResetField>
          <ResetField
            value={fields.pageTheme?.overrides.primary ?? fields.accent}
            defaultValue={defaults.accent}
            label="Accent color"
            disabled={busy}
            onreset={() => resetPalette('primary')}
          >
            <label class="color-setting">
              Accent
              <input
                type="color"
                aria-label="Accent color"
                value={currentPalette?.primary.slice(0, 7) ?? fields.accent}
                oninput={(e) => paletteInput('primary', e.currentTarget.value)}
              />
            </label>
          </ResetField>
        </div>
        <Button
          variant="ghost"
          onclick={() => {
            if (fields.pageTheme)
              fields.pageTheme = { ...fields.pageTheme, overrides: {} };
            fields.background = null;
            fields.foreground = null;
            fields.accent = '#accbfa';
          }}>Reset colors</Button
        >
      </section>

      <details class="advanced-design">
        <summary>Advanced design</summary>
        <p class="hint">
          Fine-tune header sizing, typography, and gallery layout.
        </p>
        <section>
          <h2>Header details</h2>
          <ResetField
            value={fields.alignment}
            defaultValue={defaults.alignment}
            label="Header alignment"
            disabled={busy}
            onreset={() => (fields.alignment = defaults.alignment)}
          >
            <Field label="Header alignment">
              <Select
                bind:value={fields.alignment}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Centered' },
                ]}
              />
            </Field>
          </ResetField>
          {#if !fields.pageTheme || fields.pageTheme.definition.layout === 'classic'}<ResetField
              value={fields.headerLayout}
              defaultValue={defaults.headerLayout}
              label="Header layout"
              disabled={busy}
              onreset={() => (fields.headerLayout = defaults.headerLayout)}
            >
              <Field label="Header layout">
                <Select
                  bind:value={fields.headerLayout}
                  options={[
                    { value: 'below', label: 'Below banner' },
                    { value: 'overlay', label: 'Over banner' },
                  ]}
                />
              </Field>
            </ResetField>
          {/if}
          <ResetField
            value={fields.headerSize}
            defaultValue={defaults.headerSize}
            label="Header size"
            disabled={busy}
            onreset={() => (fields.headerSize = defaults.headerSize)}
          >
            <Field label="Header size">
              <Select
                bind:value={fields.headerSize}
                options={[
                  { value: 'compact', label: 'Compact' },
                  { value: 'standard', label: 'Standard' },
                  { value: 'tall', label: 'Tall' },
                ]}
              />
            </Field>
          </ResetField>
          {#if !saved?.banner}
            <p class="hint">Banner height applies when you add a banner.</p>
          {/if}
          <ResetField
            value={fields.titleSize}
            defaultValue={defaults.titleSize}
            label="Title size"
            disabled={busy}
            onreset={() => (fields.titleSize = defaults.titleSize)}
          >
            <label class="range-setting">
              Title size
              <div class="range-control">
                <input
                  type="range"
                  min="1.5"
                  max="4"
                  step="0.125"
                  aria-label="Title size"
                  bind:value={fields.titleSize}
                />
                <output>{fields.titleSize}rem</output>
              </div>
            </label>
          </ResetField>
          <ResetField
            value={fields.descriptionSize}
            defaultValue={defaults.descriptionSize}
            label="Description size"
            disabled={busy}
            onreset={() => (fields.descriptionSize = defaults.descriptionSize)}
          >
            <label class="range-setting">
              Description size
              <div class="range-control">
                <input
                  type="range"
                  min="0.875"
                  max="1.5"
                  step="0.0625"
                  aria-label="Description size"
                  bind:value={fields.descriptionSize}
                />
                <output>{fields.descriptionSize}rem</output>
              </div>
            </label>
          </ResetField>
          <ResetField
            value={fields.headerSpacing}
            defaultValue={defaults.headerSpacing}
            label="Header spacing"
            disabled={busy}
            onreset={() => (fields.headerSpacing = defaults.headerSpacing)}
          >
            <label class="range-setting">
              Header spacing
              <div class="range-control">
                <input
                  type="range"
                  min="1.5"
                  max="5"
                  step="0.25"
                  aria-label="Header spacing"
                  bind:value={fields.headerSpacing}
                />
                <output>{fields.headerSpacing}rem</output>
              </div>
            </label>
          </ResetField>
          {#if fields.headerLayout === 'overlay' && !saved?.banner}
            <p class="hint">
              Add a banner to place your logo, title, and description over it.
            </p>
          {/if}
          {#if bannerCropPreview}
            <div class="banner-crop-control">
              <span class="crop-label">Banner crop preview</span>
              <div
                class="banner-crop-preview"
                role="group"
                aria-label="Banner crop preview"
                aria-describedby="banner-crop-hint"
                use:bannerCropDrag
              >
                <img
                  src={bannerCropPreview}
                  alt=""
                  draggable="false"
                  style:object-position={`center ${fields.bannerPosition}%`}
                />
                <span class="crop-guides" aria-hidden="true"></span>
              </div>
              <small id="banner-crop-hint" class="hint">
                Drag the image to choose its crop. The slider supports keyboard
                controls.
              </small>
              <ResetField
                value={fields.bannerPosition}
                defaultValue={defaults.bannerPosition}
                label="Banner crop position"
                disabled={busy}
                onreset={() =>
                  (fields.bannerPosition = defaults.bannerPosition)}
              >
                <div class="crop-position-control">
                  <label for="banner-crop-position">Banner crop position</label>
                  <input
                    id="banner-crop-position"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    aria-describedby="banner-crop-hint"
                    aria-valuetext={`${fields.bannerPosition}% from top`}
                    bind:value={fields.bannerPosition}
                  />
                </div></ResetField
              >
            </div>
          {/if}
        </section>

        <section>
          <h2>Typography</h2>
          <ResetField
            value={fields.galleryStyle.titleFontWeight}
            defaultValue={defaults.galleryStyle.titleFontWeight}
            label="Title weight"
            disabled={busy}
            onreset={() =>
              (fields.galleryStyle.titleFontWeight =
                defaults.galleryStyle.titleFontWeight)}
          >
            <label class="range-setting">
              Title weight
              <div class="range-control">
                <input
                  type="range"
                  min="400"
                  max="800"
                  step="50"
                  aria-label="Title weight"
                  value={fields.galleryStyle.titleFontWeight}
                  oninput={(event) =>
                    changeGalleryStyle(
                      'titleFontWeight',
                      Number(event.currentTarget.value),
                    )}
                />
                <output>{fields.galleryStyle.titleFontWeight}</output>
              </div>
            </label>
          </ResetField>
          <ResetField
            value={fields.galleryStyle.bodyFontSize}
            defaultValue={defaults.galleryStyle.bodyFontSize}
            label="Body size"
            disabled={busy}
            onreset={() =>
              (fields.galleryStyle.bodyFontSize =
                defaults.galleryStyle.bodyFontSize)}
          >
            <label class="range-setting">
              Body size
              <div class="range-control">
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.0625"
                  aria-label="Body size"
                  value={fields.galleryStyle.bodyFontSize}
                  oninput={(event) =>
                    changeGalleryStyle(
                      'bodyFontSize',
                      Number(event.currentTarget.value),
                    )}
                />
                <output>{fields.galleryStyle.bodyFontSize}rem</output>
              </div>
            </label>
          </ResetField>
          <ResetField
            value={fields.galleryStyle.bodyFontWeight}
            defaultValue={defaults.galleryStyle.bodyFontWeight}
            label="Body weight"
            disabled={busy}
            onreset={() =>
              (fields.galleryStyle.bodyFontWeight =
                defaults.galleryStyle.bodyFontWeight)}
          >
            <label class="range-setting">
              Body weight
              <div class="range-control">
                <input
                  type="range"
                  min="300"
                  max="700"
                  step="50"
                  aria-label="Body weight"
                  value={fields.galleryStyle.bodyFontWeight}
                  oninput={(event) =>
                    changeGalleryStyle(
                      'bodyFontWeight',
                      Number(event.currentTarget.value),
                    )}
                />
                <output>{fields.galleryStyle.bodyFontWeight}</output>
              </div>
            </label>
          </ResetField>
          <ResetField
            value={fields.galleryStyle.cardTitleSize}
            defaultValue={defaults.galleryStyle.cardTitleSize}
            label="Album title size"
            disabled={busy}
            onreset={() =>
              (fields.galleryStyle.cardTitleSize =
                defaults.galleryStyle.cardTitleSize)}
          >
            <label class="range-setting">
              Album title size
              <div class="range-control">
                <input
                  type="range"
                  min="0.75"
                  max="2"
                  step="0.0625"
                  aria-label="Album title size"
                  value={fields.galleryStyle.cardTitleSize}
                  oninput={(event) =>
                    changeGalleryStyle(
                      'cardTitleSize',
                      Number(event.currentTarget.value),
                    )}
                />
                <output>{fields.galleryStyle.cardTitleSize}rem</output>
              </div>
            </label>
          </ResetField>
          <ResetField
            value={fields.galleryStyle.cardTitleWeight}
            defaultValue={defaults.galleryStyle.cardTitleWeight}
            label="Album title weight"
            disabled={busy}
            onreset={() =>
              (fields.galleryStyle.cardTitleWeight =
                defaults.galleryStyle.cardTitleWeight)}
          >
            <label class="range-setting">
              Album title weight
              <div class="range-control">
                <input
                  type="range"
                  min="400"
                  max="800"
                  step="50"
                  aria-label="Album title weight"
                  value={fields.galleryStyle.cardTitleWeight}
                  oninput={(event) =>
                    changeGalleryStyle(
                      'cardTitleWeight',
                      Number(event.currentTarget.value),
                    )}
                />
                <output>{fields.galleryStyle.cardTitleWeight}</output>
              </div>
            </label>
          </ResetField>
        </section>

        <section>
          <h2>Layout</h2>
          <ResetField
            value={fields.galleryStyle.contentWidth}
            defaultValue={defaults.galleryStyle.contentWidth}
            label="Content width"
            disabled={busy}
            onreset={() =>
              (fields.galleryStyle.contentWidth =
                defaults.galleryStyle.contentWidth)}
          >
            <label class="range-setting">
              Content width
              <div class="range-control">
                <input
                  type="range"
                  min="640"
                  max="1920"
                  step="40"
                  aria-label="Content width"
                  value={fields.galleryStyle.contentWidth}
                  oninput={(event) =>
                    changeGalleryStyle(
                      'contentWidth',
                      Number(event.currentTarget.value),
                    )}
                />
                <output>{fields.galleryStyle.contentWidth}px</output>
              </div>
            </label>
          </ResetField>
          <ResetField
            value={fields.galleryStyle.pagePadding}
            defaultValue={defaults.galleryStyle.pagePadding}
            label="Page padding"
            disabled={busy}
            onreset={() =>
              (fields.galleryStyle.pagePadding =
                defaults.galleryStyle.pagePadding)}
          >
            <label class="range-setting">
              Page padding
              <div class="range-control">
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="4"
                  aria-label="Page padding"
                  value={fields.galleryStyle.pagePadding}
                  oninput={(event) =>
                    changeGalleryStyle(
                      'pagePadding',
                      Number(event.currentTarget.value),
                    )}
                />
                <output>{fields.galleryStyle.pagePadding}px</output>
              </div>
            </label>
          </ResetField>
          <ResetField
            value={fields.galleryStyle.gridMinWidth}
            defaultValue={defaults.galleryStyle.gridMinWidth}
            label="Grid density"
            disabled={busy}
            onreset={() =>
              (fields.galleryStyle.gridMinWidth =
                defaults.galleryStyle.gridMinWidth)}
          >
            <label class="range-setting">
              Grid density
              <div class="range-control">
                <input
                  type="range"
                  min="160"
                  max="360"
                  step="8"
                  aria-label="Grid density"
                  value={fields.galleryStyle.gridMinWidth}
                  oninput={(event) =>
                    changeGalleryStyle(
                      'gridMinWidth',
                      Number(event.currentTarget.value),
                    )}
                />
                <output>{fields.galleryStyle.gridMinWidth}px minimum</output>
              </div>
            </label>
          </ResetField>
          <ResetField
            value={fields.galleryStyle.gridRowGap}
            defaultValue={defaults.galleryStyle.gridRowGap}
            label="Row spacing"
            disabled={busy}
            onreset={() =>
              (fields.galleryStyle.gridRowGap =
                defaults.galleryStyle.gridRowGap)}
          >
            <label class="range-setting">
              Row spacing
              <div class="range-control">
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="4"
                  aria-label="Row spacing"
                  value={fields.galleryStyle.gridRowGap}
                  oninput={(event) =>
                    changeGalleryStyle(
                      'gridRowGap',
                      Number(event.currentTarget.value),
                    )}
                />
                <output>{fields.galleryStyle.gridRowGap}px</output>
              </div>
            </label>
          </ResetField>
          <ResetField
            value={fields.galleryStyle.gridColumnGap}
            defaultValue={defaults.galleryStyle.gridColumnGap}
            label="Column spacing"
            disabled={busy}
            onreset={() =>
              (fields.galleryStyle.gridColumnGap =
                defaults.galleryStyle.gridColumnGap)}
          >
            <label class="range-setting">
              Column spacing
              <div class="range-control">
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="4"
                  aria-label="Column spacing"
                  value={fields.galleryStyle.gridColumnGap}
                  oninput={(event) =>
                    changeGalleryStyle(
                      'gridColumnGap',
                      Number(event.currentTarget.value),
                    )}
                />
                <output>{fields.galleryStyle.gridColumnGap}px</output>
              </div>
            </label>
          </ResetField>
          <ResetField
            value={fields.galleryStyle.coverAspectRatio}
            defaultValue={defaults.galleryStyle.coverAspectRatio}
            label="Cover aspect ratio"
            disabled={busy}
            onreset={() =>
              (fields.galleryStyle.coverAspectRatio =
                defaults.galleryStyle.coverAspectRatio)}
          >
            <label class="range-setting">
              Cover aspect ratio
              <div class="range-control">
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  aria-label="Cover aspect ratio"
                  value={fields.galleryStyle.coverAspectRatio}
                  oninput={(event) =>
                    changeGalleryStyle(
                      'coverAspectRatio',
                      Number(event.currentTarget.value),
                    )}
                />
                <output
                  >{fields.galleryStyle.coverAspectRatio.toFixed(2)}</output
                >
              </div>
            </label>
          </ResetField>
          <ResetField
            value={fields.galleryStyle.cardRadius}
            defaultValue={defaults.galleryStyle.cardRadius}
            label="Corner radius"
            disabled={busy}
            onreset={() =>
              (fields.galleryStyle.cardRadius =
                defaults.galleryStyle.cardRadius)}
          >
            <label class="range-setting">
              Corner radius
              <div class="range-control">
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="2"
                  aria-label="Corner radius"
                  value={fields.galleryStyle.cardRadius}
                  oninput={(event) =>
                    changeGalleryStyle(
                      'cardRadius',
                      Number(event.currentTarget.value),
                    )}
                />
                <output>{fields.galleryStyle.cardRadius}px</output>
              </div>
            </label>
          </ResetField>
          <ResetField
            value={fields.galleryStyle.hoverTreatment}
            defaultValue={defaults.galleryStyle.hoverTreatment}
            label="Hover treatment"
            disabled={busy}
            onreset={() =>
              (fields.galleryStyle.hoverTreatment =
                defaults.galleryStyle.hoverTreatment)}
          >
            <Field label="Hover treatment">
              <Select
                bind:value={fields.galleryStyle.hoverTreatment}
                options={[
                  { value: 'surface', label: 'Surface' },
                  { value: 'underline', label: 'Underline' },
                  { value: 'lift', label: 'Lift' },
                  { value: 'none', label: 'None' },
                ]}
              />
            </Field>
          </ResetField>
        </section>
      </details>
    </div>
  {:else if activeTab === 'Elements'}
    <div
      class="tab-panel elements-panel"
      id="customize-panel-elements"
      role="tabpanel"
      aria-labelledby="customize-tab-elements"
      tabindex="0"
    >
      <p class="hint">
        Hidden elements keep their saved content and settings. They appear again
        when you turn them back on.
      </p>

      <fieldset class="toggle-group">
        <legend>Header</legend>
        <ResetField
          value={fields.clientUi.showBanner}
          defaultValue={defaults.clientUi.showBanner}
          label="Show banner"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showBanner',
            ))}
        >
          <div class="toggle-row">
            <span>Banner</span><Switch
              aria-label="Show banner"
              checked={fields.clientUi.showBanner}
              onCheckedChange={(value) => changeClientUi('showBanner', value)}
            />
          </div>
        </ResetField>
        <ResetField
          value={fields.clientUi.showLogo}
          defaultValue={defaults.clientUi.showLogo}
          label="Show logo"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(fields.clientUi, 'showLogo'))}
        >
          <div class="toggle-row">
            <span>Logo</span><Switch
              aria-label="Show logo"
              checked={fields.clientUi.showLogo}
              onCheckedChange={(value) => changeClientUi('showLogo', value)}
            />
          </div>
        </ResetField>
        <ResetField
          value={fields.clientUi.showTitle}
          defaultValue={defaults.clientUi.showTitle}
          label="Show title"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showTitle',
            ))}
        >
          <div class="toggle-row">
            <span>Title</span><Switch
              aria-label="Show title"
              checked={fields.clientUi.showTitle}
              onCheckedChange={(value) => changeClientUi('showTitle', value)}
            />
          </div>
        </ResetField>
        <ResetField
          value={fields.clientUi.showDescription}
          defaultValue={defaults.clientUi.showDescription}
          label="Show description"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showDescription',
            ))}
        >
          <div class="toggle-row">
            <span>Description</span><Switch
              aria-label="Show description"
              checked={fields.clientUi.showDescription}
              onCheckedChange={(value) =>
                changeClientUi('showDescription', value)}
            />
          </div>
        </ResetField>
      </fieldset>

      <fieldset class="toggle-group">
        <legend>Browsing</legend>
        <ResetField
          value={fields.clientUi.showBrowsingControls}
          defaultValue={defaults.clientUi.showBrowsingControls}
          label="Show browsing controls"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showBrowsingControls',
            ))}
        >
          <div class="toggle-row">
            <span>Browsing controls</span><Switch
              aria-label="Show browsing controls"
              checked={fields.clientUi.showBrowsingControls}
              onCheckedChange={(value) =>
                changeClientUi('showBrowsingControls', value)}
            />
          </div>
        </ResetField>
        <ResetField
          value={fields.clientUi.showAlbumSearch}
          defaultValue={defaults.clientUi.showAlbumSearch}
          label="Show album search"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showAlbumSearch',
            ))}
        >
          <div class="toggle-row nested">
            <span>Album search</span><Switch
              aria-label="Show album search"
              disabled={!fields.clientUi.showBrowsingControls}
              checked={fields.clientUi.showAlbumSearch}
              onCheckedChange={(value) =>
                changeClientUi('showAlbumSearch', value)}
            />
          </div>
        </ResetField>
        <ResetField
          value={fields.clientUi.showMonthFilter}
          defaultValue={defaults.clientUi.showMonthFilter}
          label="Show month filter"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showMonthFilter',
            ))}
        >
          <div class="toggle-row nested">
            <span>Month filter</span><Switch
              aria-label="Show month filter"
              disabled={!fields.clientUi.showBrowsingControls}
              checked={fields.clientUi.showMonthFilter}
              onCheckedChange={(value) =>
                changeClientUi('showMonthFilter', value)}
            />
          </div>
        </ResetField>
        <ResetField
          value={fields.clientUi.showYearNavigation}
          defaultValue={defaults.clientUi.showYearNavigation}
          label="Show year navigation"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showYearNavigation',
            ))}
        >
          <div class="toggle-row nested">
            <span>Year navigation</span><Switch
              aria-label="Show year navigation"
              disabled={!fields.clientUi.showBrowsingControls}
              checked={fields.clientUi.showYearNavigation}
              onCheckedChange={(value) =>
                changeClientUi('showYearNavigation', value)}
            />
          </div>
        </ResetField>
        <ResetField
          value={fields.clientUi.showResultsCount}
          defaultValue={defaults.clientUi.showResultsCount}
          label="Show results count"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showResultsCount',
            ))}
        >
          <div class="toggle-row nested">
            <span>Results count</span><Switch
              aria-label="Show results count"
              disabled={!fields.clientUi.showBrowsingControls}
              checked={fields.clientUi.showResultsCount}
              onCheckedChange={(value) =>
                changeClientUi('showResultsCount', value)}
            />
          </div>
        </ResetField>
      </fieldset>

      <fieldset class="toggle-group">
        <legend>Albums</legend>
        <ResetField
          value={fields.clientUi.showAlbums}
          defaultValue={defaults.clientUi.showAlbums}
          label="Show albums"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showAlbums',
            ))}
        >
          <div class="toggle-row">
            <span>Album section</span><Switch
              aria-label="Show albums"
              disabled={!fields.clientUi.showAlbumCovers &&
                !fields.clientUi.showAlbumTitles}
              checked={fields.clientUi.showAlbums}
              onCheckedChange={(value) => changeClientUi('showAlbums', value)}
            />
          </div>
        </ResetField>
        <ResetField
          value={fields.clientUi.showAlbumCovers}
          defaultValue={defaults.clientUi.showAlbumCovers}
          label="Show album covers"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showAlbumCovers',
            ))}
        >
          <div class="toggle-row nested">
            <span>Covers</span><Switch
              aria-label="Show album covers"
              disabled={fields.clientUi.showAlbums &&
                !fields.clientUi.showAlbumTitles &&
                fields.clientUi.showAlbumCovers}
              checked={fields.clientUi.showAlbumCovers}
              onCheckedChange={(value) =>
                changeClientUi('showAlbumCovers', value)}
            />
          </div>
        </ResetField>
        <ResetField
          value={fields.clientUi.showAlbumTitles}
          defaultValue={defaults.clientUi.showAlbumTitles}
          label="Show album names"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showAlbumTitles',
            ))}
        >
          <div class="toggle-row nested">
            <span>Names</span><Switch
              aria-label="Show album names"
              disabled={fields.clientUi.showAlbums &&
                !fields.clientUi.showAlbumCovers &&
                fields.clientUi.showAlbumTitles}
              checked={fields.clientUi.showAlbumTitles}
              onCheckedChange={(value) =>
                changeClientUi('showAlbumTitles', value)}
            />
          </div>
        </ResetField>
        <p class="hint">
          When the album section is visible, keep either covers or names visible
          so each album link has a clear label.
        </p>
        <ResetField
          value={fields.clientUi.showAlbumDates}
          defaultValue={defaults.clientUi.showAlbumDates}
          label="Show album dates"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showAlbumDates',
            ))}
        >
          <div class="toggle-row nested">
            <span>Dates</span><Switch
              aria-label="Show album dates"
              disabled={!fields.clientUi.showAlbums}
              checked={fields.clientUi.showAlbumDates}
              onCheckedChange={(value) =>
                changeClientUi('showAlbumDates', value)}
            />
          </div>
        </ResetField>
        <ResetField
          value={fields.clientUi.showAlbumItemCounts}
          defaultValue={defaults.clientUi.showAlbumItemCounts}
          label="Show album item counts"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showAlbumItemCounts',
            ))}
        >
          <div class="toggle-row nested">
            <span>Item counts</span><Switch
              aria-label="Show album item counts"
              disabled={!fields.clientUi.showAlbums}
              checked={fields.clientUi.showAlbumItemCounts}
              onCheckedChange={(value) =>
                changeClientUi('showAlbumItemCounts', value)}
            />
          </div>
        </ResetField>
        <ResetField
          value={fields.clientUi.showSharedLabels}
          defaultValue={defaults.clientUi.showSharedLabels}
          label="Show Shared labels"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showSharedLabels',
            ))}
        >
          <div class="toggle-row nested">
            <span>Shared labels</span><Switch
              aria-label="Show Shared labels"
              disabled={!fields.clientUi.showAlbums}
              checked={fields.clientUi.showSharedLabels}
              onCheckedChange={(value) =>
                changeClientUi('showSharedLabels', value)}
            />
          </div>
        </ResetField>
      </fieldset>

      <fieldset class="toggle-group">
        <legend>Years</legend>
        <ResetField
          value={fields.clientUi.showYearHeadings}
          defaultValue={defaults.clientUi.showYearHeadings}
          label="Show year headings"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showYearHeadings',
            ))}
        >
          <div class="toggle-row">
            <span>Year headings</span><Switch
              aria-label="Show year headings"
              checked={fields.clientUi.showYearHeadings}
              onCheckedChange={(value) =>
                changeClientUi('showYearHeadings', value)}
            />
          </div>
        </ResetField>
        <ResetField
          value={fields.clientUi.showYearCounts}
          defaultValue={defaults.clientUi.showYearCounts}
          label="Show year counts"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showYearCounts',
            ))}
        >
          <div class="toggle-row nested">
            <span>Year counts</span><Switch
              aria-label="Show year counts"
              checked={fields.clientUi.showYearCounts}
              onCheckedChange={(value) =>
                changeClientUi('showYearCounts', value)}
            />
          </div>
        </ResetField>
        <ResetField
          value={fields.clientUi.allowYearCollapse}
          defaultValue={defaults.clientUi.allowYearCollapse}
          label="Allow year groups to collapse"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'allowYearCollapse',
            ))}
        >
          <div class="toggle-row nested">
            <span>Allow collapsing years</span><Switch
              aria-label="Allow year groups to collapse"
              disabled={!fields.clientUi.showYearHeadings}
              checked={fields.clientUi.allowYearCollapse}
              onCheckedChange={(value) =>
                changeClientUi('allowYearCollapse', value)}
            />
          </div>
        </ResetField>
        <p class="hint">
          Hiding year headings preserves album order and year navigation.
          Turning off collapsing leaves every group expanded.
        </p>
      </fieldset>

      <fieldset class="toggle-group">
        <legend>Footer</legend>
        <ResetField
          value={fields.clientUi.showBranding}
          defaultValue={defaults.clientUi.showBranding}
          label="Show ImmichPager branding"
          disabled={busy}
          onreset={() =>
            (fields.clientUi = resetClientUiValue(
              fields.clientUi,
              'showBranding',
            ))}
        >
          <div class="toggle-row">
            <span>ImmichPager branding</span><Switch
              aria-label="Show ImmichPager branding"
              checked={fields.clientUi.showBranding}
              onCheckedChange={(value) => changeClientUi('showBranding', value)}
            />
          </div>
        </ResetField>
        <p class="hint">
          Source and license access remains available in the page footer.
        </p>
      </fieldset>
    </div>
  {:else if activeTab === 'Themes'}
    <div
      class="tab-panel themes-panel"
      id="customize-panel-themes"
      role="tabpanel"
      aria-labelledby="customize-tab-themes"
      tabindex="0"
    >
      <ThemePanel
        bind:fields
        bind:undo={themeUndo}
        {busy}
        onPreview={onThemePreview}
      />
      <details>
        <summary>Advanced appearance and token files</summary>
        <section>
          <h2>Pager appearance file</h2>
          <p class="hint">
            Share a complete design with visibility, visual settings, and CSS.
            Page title, description, URL, albums, passwords, and branding images
            stay on this page.
          </p>
          <Button variant="ghost" onclick={exportAppearance} disabled={busy}
            >Export appearance JSON</Button
          >
          <label for="appearance-file">Import appearance JSON</label>
          <input
            id="appearance-file"
            type="file"
            accept="application/json,.json"
            aria-describedby="appearance-file-help appearance-file-status"
            onchange={importAppearance}
            disabled={busy}
          />
          <small id="appearance-file-help"
            >Appearance files up to 96 KiB are supported. Imports autosave
            privately; publish to update the client page.</small
          >
          <p
            id="appearance-file-status"
            class:error={!!appearanceFileError}
            role={appearanceFileError
              ? 'alert'
              : appearanceFileStatus
                ? 'status'
                : undefined}
          >
            {appearanceFileError || appearanceFileStatus}
          </p>
        </section>

        <section>
          <h2>Design tokens</h2>
          <p class="hint">
            Import or export visual settings in DTCG JSON format. Token files
            update colors and styling while keeping visibility and custom CSS as
            saved.
          </p>
          <Button variant="ghost" onclick={exportTokens} disabled={busy}
            >Export .tokens.json</Button
          >
          <label for="token-file">Import .tokens.json</label>
          <input
            id="token-file"
            type="file"
            accept="application/json,.json"
            aria-describedby="token-file-help token-file-status"
            onchange={previewTokens}
            disabled={busy}
          />
          <small id="token-file-help"
            >Token files up to 96 KiB are supported. Review recognized and
            unsupported paths before applying.</small
          >
          {#if tokenPreview}
            <div class="token-summary" aria-live="polite">
              <h3>Import summary</h3>
              <p>
                {tokenPreview.recognized.length} recognized token{tokenPreview
                  .recognized.length === 1
                  ? ''
                  : 's'}; {tokenPreview.unsupported.length} unsupported path{tokenPreview
                  .unsupported.length === 1
                  ? ''
                  : 's'}.
              </p>
              {#if tokenPreview.recognized.length}
                <ul aria-label="Recognized design tokens">
                  {#each tokenPreview.recognized as token (token.path)}
                    <li>
                      <code>{token.path}</code><span>{String(token.value)}</span
                      >
                    </li>
                  {/each}
                </ul>
              {/if}
              {#if tokenPreview.unsupported.length}
                <details>
                  <summary>Unsupported token paths</summary>
                  <ul>
                    {#each tokenPreview.unsupported as path (path)}<li>
                        <code>{path}</code>
                      </li>{/each}
                  </ul>
                </details>
              {/if}
              <Button
                variant="ghost"
                disabled={busy || !tokenPreview.hasApplicableTokens}
                onclick={applyTokens}>Apply styling</Button
              >
            </div>
          {/if}
          <p
            id="token-file-status"
            class:error={!!tokenFileError}
            role={tokenFileError
              ? 'alert'
              : tokenFileStatus
                ? 'status'
                : undefined}
          >
            {tokenFileError || tokenFileStatus}
          </p>
        </section>
      </details>
    </div>
  {:else}
    <div
      class="tab-panel css-panel"
      id="customize-panel-css"
      role="tabpanel"
      aria-labelledby="customize-tab-css"
      tabindex="-1"
    >
      <section>
        <h2>Custom CSS</h2>
        <p class="hint">
          CSS styles this gallery only. The editor and its controls keep Immich
          styling. Changes save privately and go live when you publish.
        </p>
        <CodeMirrorCssEditor
          bind:value={fields.customCss}
          invalid={!!cssValidation.error}
        />
        <small id="css-count"
          >{fields.customCss.length.toLocaleString('en')} / {CUSTOM_CSS_LIMIT.toLocaleString(
            'en',
          )} characters</small
        >
        <p
          id="css-feedback"
          class:error={!!cssValidation.error}
          role={cssValidation.error ? 'alert' : undefined}
        >
          {cssValidation.error
            ? `${cssValidation.error} Saved privately; omitted from preview. Fix before publishing.`
            : 'External resources and imports are blocked.'}
        </p>
        <div class="css-actions">
          <a
            href="https://gitlab.com/wispd/ImmichPager/-/blob/dev/docs/customization.md"
            target="_blank"
            rel="noreferrer">CSS guide and examples ↗</a
          >
          <Button
            variant="ghost"
            onclick={() => {
              const example =
                ':scope { --pager-accent: #f0b67f; }\n.ip-title { font-family: Georgia, serif; }';
              const separator = fields.customCss.trim() ? '\n\n' : '';
              if (
                fields.customCss.length + separator.length + example.length >
                CUSTOM_CSS_LIMIT
              ) {
                cssExampleStatus =
                  'There is not enough room to add the example. Clear or shorten CSS first.';
                return;
              }
              fields.customCss += `${separator}${example}`;
              cssExampleStatus = 'Example added to the end of your CSS.';
            }}>Insert example</Button
          >
          <Button
            variant="ghost"
            disabled={!fields.customCss}
            onclick={() => {
              fields.customCss = '';
              cssExampleStatus = '';
            }}>Clear custom CSS</Button
          >
        </div>
        {#if cssExampleStatus}<p role="status">{cssExampleStatus}</p>{/if}
      </section>
    </div>
  {/if}

  <div class="panel-footer">
    <span class="hint"
      >{busy ? 'Working…' : 'Draft changes autosave privately'}</span
    >
  </div>
</section>

<style>
  .canvas-height-control {
    display: grid;
    gap: 8px;
    margin-bottom: 20px;
  }
  .customize-panel {
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    min-block-size: 0;
    overflow: hidden;
    color: var(--pager-management-text);
    background: var(--pager-management-background);
    border-inline-end: 1px solid var(--pager-management-border);
  }

  .panel-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 20px 4px;
  }

  .panel-heading h1,
  .tab-panel h2,
  .tab-panel h3,
  .tab-panel p {
    margin-block: 0;
  }

  .panel-heading h1 {
    font-size: 16px;
    font-weight: 600;
  }

  .hint {
    color: var(--pager-management-text-secondary);
    font-size: 12px;
    line-height: 1.55;
  }

  .tab-list {
    display: flex;
    gap: 4px;
    padding: 0 16px 6px;
    border-bottom: 1px solid var(--pager-management-border);
  }

  .tab-list button {
    flex: 1 1 0;
    min-block-size: 36px;
    border: 0;
    border-radius: 7px;
    padding-inline: 8px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }

  .tab-list button[aria-selected='true'] {
    background: var(--pager-management-surface-raised);
    color: var(--pager-management-text);
    font-weight: 600;
  }

  .tab-list button:hover {
    background: var(--pager-management-surface-quiet);
  }

  .tab-list button:focus-visible {
    outline: 2px solid var(--pager-management-focus);
    outline-offset: 2px;
  }

  .tab-panel {
    min-block-size: 0;
    padding: 16px 20px 32px;
    overflow: auto;
    overscroll-behavior: contain;
  }

  .tab-panel > section {
    display: grid;
    gap: 14px;
    padding-block: 18px;
    border-bottom: 1px solid var(--pager-management-border);
  }

  .tab-panel > section:first-child {
    padding-block-start: 0;
  }

  .tab-panel > section:last-child {
    border: 0;
  }

  .tab-panel h2 {
    font-size: 15px;
    font-weight: 600;
  }

  .tab-panel h3 {
    font-size: 13px;
  }

  .color-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }

  .color-setting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-size: 12px;
  }

  .color-setting input {
    inline-size: 48px;
    block-size: 38px;
    padding: 3px;
    border: 1px solid var(--pager-management-border);
    border-radius: 6px;
    color-scheme: inherit;
  }

  .advanced-design {
    padding-block: 18px;
  }
  .advanced-design summary {
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
    padding-block: 8px;
  }
  .advanced-design summary:focus-visible {
    outline: 2px solid var(--pager-management-focus);
    outline-offset: 3px;
  }
  .advanced-design > section {
    display: grid;
    gap: 14px;
    padding-block: 18px;
    border-bottom: 1px solid var(--pager-management-border);
  }
  .advanced-design > section:last-child {
    border: 0;
  }
  .range-setting {
    display: grid;
    gap: 6px;
    font-size: 13px;
  }

  .range-control {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    align-items: center;
    gap: 12px;
  }

  .range-control input {
    inline-size: 100%;
    min-block-size: 32px;
    accent-color: var(--pager-management-accent);
  }

  .range-control output {
    min-inline-size: 4.5rem;
    color: var(--pager-management-text-secondary);
    font-size: 12px;
    text-align: end;
    font-variant-numeric: tabular-nums;
  }

  .crop-position-control {
    display: grid;
    gap: 8px;
  }

  .banner-crop-control {
    display: grid;
    gap: 8px;
    font-size: 13px;
  }

  .banner-crop-preview {
    position: relative;
    inline-size: 100%;
    max-block-size: 10rem;
    aspect-ratio: 16 / 5;
    overflow: clip;
    border: 1px solid var(--pager-management-border);
    border-radius: 8px;
    background: var(--pager-management-surface);
    cursor: grab;
    touch-action: pan-x pinch-zoom;
    user-select: none;
  }

  .banner-crop-preview:global(.dragging) {
    cursor: grabbing;
  }

  .banner-crop-preview img {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
    pointer-events: none;
  }

  .crop-guides {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(
        to right,
        transparent calc(33.333% - 0.5px),
        rgb(255 255 255 / 58%) 33.333%,
        transparent calc(33.333% + 0.5px),
        transparent calc(66.666% - 0.5px),
        rgb(255 255 255 / 58%) 66.666%,
        transparent calc(66.666% + 0.5px)
      ),
      linear-gradient(
        to bottom,
        transparent calc(33.333% - 0.5px),
        rgb(255 255 255 / 58%) 33.333%,
        transparent calc(33.333% + 0.5px),
        transparent calc(66.666% - 0.5px),
        rgb(255 255 255 / 58%) 66.666%,
        transparent calc(66.666% + 0.5px)
      );
  }

  .elements-panel {
    display: grid;
    align-content: start;
    gap: 16px;
  }

  .toggle-group {
    display: grid;
    gap: 6px;
    min-inline-size: 0;
    margin: 0;
    padding: 12px;
    border: 1px solid var(--pager-management-border);
    border-radius: 8px;
  }

  .toggle-group legend {
    padding-inline: 4px;
    font-size: 14px;
    font-weight: 600;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-block-size: 36px;
    font-size: 13px;
  }

  .toggle-row.nested {
    padding-inline-start: 14px;
    color: var(--pager-management-text-secondary);
  }

  .toggle-group .hint {
    margin-block: 2px 8px;
  }

  .themes-panel input[type='file'] {
    max-inline-size: 100%;
    font-size: 13px;
  }

  .themes-panel p {
    font-size: 13px;
  }

  .themes-panel #appearance-file-status.error,
  .themes-panel #token-file-status.error {
    color: var(--pager-management-danger);
  }

  .token-summary {
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--pager-management-border);
    border-radius: 8px;
    background: var(--pager-management-surface);
  }

  .token-summary ul {
    display: grid;
    gap: 6px;
    margin: 0;
    padding-inline-start: 18px;
    overflow-wrap: anywhere;
    font-size: 12px;
  }

  .token-summary li span {
    margin-inline-start: 8px;
    color: var(--pager-management-text-secondary);
  }

  .token-summary code {
    font:
      12px/1.5 ui-monospace,
      SFMono-Regular,
      Menlo,
      monospace;
  }

  .token-summary details summary {
    font-size: 12px;
    cursor: pointer;
  }

  .css-panel > section {
    gap: 12px;
  }

  #css-count,
  #css-feedback {
    font-size: 12px;
  }

  #css-feedback {
    line-height: 1.55;
  }

  #css-feedback.error {
    color: var(--pager-management-danger);
  }

  .css-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .css-actions a {
    color: var(--pager-management-accent);
    font-size: 12px;
    margin-inline-end: auto;
  }

  .panel-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 20px;
    border-top: 1px solid var(--pager-management-border);
    background: var(--pager-management-background);
  }

  @media (min-width: 761px) {
    .panel-footer :global(button) {
      display: none;
    }
  }

  @media (max-width: 420px) {
    .customize-panel {
      min-block-size: 0;
    }

    .tab-panel {
      padding-inline: 16px;
    }

    .panel-heading {
      padding-inline: 16px;
    }

    .tab-list {
      padding-inline: 12px;
    }
  }
</style>
