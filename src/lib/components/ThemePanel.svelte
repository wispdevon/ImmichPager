<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { Button, Icon } from '@immich/ui';
  import {
    mdiCheck,
    mdiDownload,
    mdiContentCopy,
    mdiDeleteOutline,
    mdiPencilOutline,
  } from '@mdi/js';
  import type { PageInput } from '$lib/contracts';
  import {
    applyTheme,
    applyClassic,
    builtInThemes,
    classicTheme,
    captureTheme,
    cloneTheme,
    parseThemeFile,
    serializeThemeFile,
    restoreTheme,
  } from '$lib/themes';
  import {
    photographyCollections,
    type PhotographyCategory,
  } from '$lib/theme-collections';
  import type { ThemePreviewActions } from '$lib/theme-preview';
  import type { ThemeDefinition } from '$lib/theme-schema';
  import { THEME_FILE_LIMIT } from '$lib/theme-schema';
  import { importThemeCss, type CssThemeFormat } from '$lib/theme-css-import';
  import { readApiResponse } from '$lib/api-response';
  let {
    fields = $bindable(),
    undo = $bindable<PageInput | null>(null),
    busy = false,
    onPreview = () => {},
  }: {
    fields: PageInput;
    undo?: PageInput | null;
    busy?: boolean;
    onPreview?: (page: PageInput | null, actions?: ThemePreviewActions) => void;
  } = $props();
  type RecordValue = {
    id: string;
    revision: number;
    definition: ThemeDefinition;
    updatedAt: string;
  };
  type Summary = {
    id: string;
    revision: number;
    name: string;
    description: string;
    layout: string;
    modes: string[];
  };
  let library = $state<Summary[]>([]),
    cursor = $state<string | null>(null),
    loading = $state(false);
  let error = $state(''),
    status = $state(''),
    search = $state(''),
    name = $state('My theme');
  let audition = $state<ThemeDefinition | null>(null),
    classicPreview = $state(false);
  let chosen = $state<RecordValue | null>(null),
    pendingDelete = $state<Summary | null>(null);
  let source = $state(''),
    format = $state<'native' | CssThemeFormat>('native'),
    base = $state('studio');
  let sourceName = $state(''),
    singleMode = $state<'' | 'light' | 'dark'>('');
  let warnings = $state<string[]>([]),
    recognized = $state<string[]>([]),
    imported = $state<ThemeDefinition | null>(null);
  let themeTrigger: HTMLElement | null = null;
  let withoutCss = $state(false);
  let category = $state<PhotographyCategory>('wedding');
  const collection = $derived(
    photographyCollections.find((item) => item.id === category)!,
  );
  const visible = $derived(
    library.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())),
  );
  async function request<T>(
    url: string,
    method = 'GET',
    data?: unknown,
  ): Promise<T> {
    return readApiResponse<T>(
      await fetch(url, {
        method,
        headers: data ? { 'content-type': 'application/json' } : undefined,
        body: data ? JSON.stringify(data) : undefined,
      }),
    );
  }
  let listRequest = 0;
  async function load(append = false, query = search) {
    const ticket = ++listRequest;
    loading = true;
    error = '';
    try {
      const result = await request<{
        items: Summary[];
        nextCursor: string | null;
      }>(
        `/page/api/themes?q=${encodeURIComponent(query)}${append && cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
      );
      if (ticket !== listRequest) return;
      library = append ? [...library, ...result.items] : result.items;
      cursor = result.nextCursor;
    } catch (e) {
      if (ticket === listRequest)
        error = e instanceof Error ? e.message : 'Could not load your themes.';
    } finally {
      if (ticket === listRequest) loading = false;
    }
  }
  $effect(() => {
    const query = search;
    const timer = setTimeout(() => void load(false, query), 200);
    return () => clearTimeout(timer);
  });
  onDestroy(() => onPreview(null));
  function tryTheme(definition: ThemeDefinition | null) {
    if (
      document.activeElement instanceof HTMLElement &&
      document.activeElement.closest('.themes')
    )
      themeTrigger = document.activeElement;
    audition = definition ? cloneTheme(definition) : null;
    classicPreview = !definition;
    error = '';
    status = '';
    const value = definition
      ? applyTheme($state.snapshot(fields), definition)
      : applyClassic($state.snapshot(fields));
    if (withoutCss) value.customCss = '';
    onPreview(value, {
      name: definition?.name ?? 'Immich Classic',
      apply,
      cancel,
      hasCustomCss: !!fields.customCss,
      withoutCss,
      setWithoutCss: (value) => {
        withoutCss = value;
        tryTheme(audition);
      },
    });
  }
  function cancel() {
    audition = null;
    classicPreview = false;
    withoutCss = false;
    onPreview(null);
    void tick().then(
      () =>
        themeTrigger?.isConnected &&
        themeTrigger.focus({ preventScroll: true }),
    );
  }
  function apply() {
    undo = cloneTheme($state.snapshot(fields));
    fields = audition
      ? applyTheme($state.snapshot(fields), $state.snapshot(audition))
      : applyClassic($state.snapshot(fields));
    if (withoutCss) fields.customCss = '';
    cancel();
    status = 'Theme applied to this private draft. Publish when ready.';
  }
  async function choose(item: Summary) {
    loading = true;
    error = '';
    try {
      chosen = await request<RecordValue>(`/page/api/themes/${item.id}`);
      name = chosen.definition.name;
      tryTheme(chosen.definition);
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  }
  async function saveCurrent() {
    loading = true;
    error = '';
    try {
      const definition = captureTheme($state.snapshot(fields), name);
      await request('/page/api/themes', 'POST', { definition });
      status = 'Design saved to your personal theme library.';
      await load();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }
  async function saveImported() {
    if (!imported) return;
    loading = true;
    error = '';
    try {
      await request('/page/api/themes', 'POST', {
        definition: {
          ...cloneTheme($state.snapshot(imported)),
          name: name.trim() || imported.name,
        },
      });
      await load();
      status = 'Imported design saved to your library.';
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  }
  async function rename() {
    if (!chosen) return;
    loading = true;
    error = '';
    try {
      chosen = await request<RecordValue>(
        `/page/api/themes/${chosen.id}`,
        'PATCH',
        {
          definition: {
            ...cloneTheme($state.snapshot(chosen.definition)),
            name,
          },
          expectedRevision: chosen.revision,
        },
      );
      await load();
      status = 'Theme renamed. Applied pages are unchanged.';
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  }
  async function duplicate(item: Summary) {
    error = '';
    try {
      const record = await request<RecordValue>(`/page/api/themes/${item.id}`);
      await request('/page/api/themes', 'POST', {
        definition: {
          ...record.definition,
          name: `${record.definition.name} copy`.slice(0, 100),
        },
      });
      await load();
      status = 'Theme duplicated.';
    } catch (e) {
      error = String(e);
    }
  }
  async function remove() {
    if (!pendingDelete) return;
    error = '';
    try {
      await request(`/page/api/themes/${pendingDelete.id}`, 'DELETE', {
        expectedRevision: pendingDelete.revision,
      });
      pendingDelete = null;
      chosen = null;
      await load();
      status = 'Theme deleted. Applied page designs are unchanged.';
    } catch (e) {
      error = String(e);
    }
  }
  function downloadCurrent() {
    try {
      download(captureTheme($state.snapshot(fields), name || 'My theme'));
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  function download(definition: ThemeDefinition) {
    error = '';
    try {
      const blob = new Blob([serializeThemeFile(definition)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'immichpager-theme.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      error = String(e);
    }
  }
  async function readFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    imported = null;
    warnings = [];
    recognized = [];
    try {
      if (file.size > THEME_FILE_LIMIT)
        throw new Error('Theme files must be no larger than 96 KiB.');
      source = await file.text();
      imported = null;
      warnings = [];
      recognized = [];
    } catch (e) {
      error = String(e);
    } finally {
      input.value = '';
    }
  }
  function inspect() {
    error = '';
    imported = null;
    warnings = [];
    recognized = [];
    try {
      if (format === 'native') {
        imported = parseThemeFile(source);
        recognized = ['Complete Pager theme'];
      } else {
        const result = importThemeCss(
          source,
          format,
          builtInThemes.find((t) => t.layout === base)!,
          sourceName || undefined,
          singleMode || undefined,
        );
        imported = result.definition;
        warnings = result.warnings;
        recognized = result.recognized;
      }
      name = imported.name;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
</script>

{#snippet themeCard(item: ThemeDefinition)}
  {@const active =
    item.layout === 'classic'
      ? !fields.pageTheme
      : fields.pageTheme?.definition.name === item.name}
  <button
    type="button"
    class="theme-card"
    class:active
    disabled={busy}
    aria-label={`Try ${item.name} theme`}
    aria-pressed={(audition?.name ??
      (classicPreview ? 'Immich Classic' : '')) === item.name}
    onclick={() => {
      chosen = null;
      tryTheme(item.layout === 'classic' ? null : item);
    }}
  >
    <span
      class={`mini mini-${item.layout}`}
      style={`--mini-bg:${item.variants.light?.background ?? item.variants.dark?.background};--mini-fg:${item.variants.light?.foreground ?? item.variants.dark?.foreground};--mini-accent:${item.variants.light?.primary ?? item.variants.dark?.primary}`}
      aria-hidden="true"
      ><i class="mini-heading"></i><i class="mini-image"></i><span
        class="mini-photos"><i></i><i></i><i></i><i></i></span
      ></span
    >
    <strong
      >{item.name}{#if active}<Icon
          icon={mdiCheck}
          size="16px"
          aria-hidden
        />{/if}</strong
    ><small>{item.description}</small>
  </button>
{/snippet}

<section class="themes" aria-label="Page themes">
  <div class="intro">
    <h2>Choose a complete design</h2>
    <p>
      Change the composition, typography, and gallery layout. Your photographs
      and words stay yours.
    </p>
  </div>
  <div class="theme-grid" aria-label="Built-in themes">
    {#each [classicTheme, ...builtInThemes] as item}
      {@render themeCard(item)}
    {/each}
  </div>
  <section
    class="photography-collection"
    aria-label="Photography theme collections"
  >
    <h2>For your photography</h2>
    <label
      >Photography speciality<select
        aria-label="Photography speciality"
        bind:value={category}
      >
        {#each photographyCollections as item}<option value={item.id}
            >{item.label}</option
          >{/each}
      </select></label
    >
    <p class="hint">{collection.description}</p>
    <div class="theme-grid" aria-label={`${collection.label} themes`}>
      {#each collection.themes as item (item.id)}<div class="collection-card">
          {@render themeCard(item.definition)}
          <a class="theme-download" href={item.path} download
            >Download theme JSON</a
          >
        </div>{/each}
    </div>
    <p class="hint">
      Adapted from HTML5 UP under CC BY 3.0. Source credit stays with each
      design.
    </p>
  </section>
  {#if undo}<Button
      variant="ghost"
      onclick={() => {
        if (undo) {
          fields = restoreTheme($state.snapshot(fields), $state.snapshot(undo));
          undo = null;
          cancel();
          status = 'Previous design restored. Content kept.';
        }
      }}>Undo theme</Button
    >{/if}
  {#if fields.customCss}<p class="hint">
      Your custom CSS is retained above the theme and may change its appearance.
    </p>{/if}
  <section>
    <h2>My themes</h2>
    <label>Search saved themes<input type="search" bind:value={search} /></label
    >
    {#if loading}<p role="status">Loading themes…</p>{/if}
    {#if !library.length && !loading}<p class="hint">
        Save a design or import a theme to reuse it across your pages.
      </p>{/if}
    <ul class="saved-themes">
      {#each visible as item (item.id)}<li>
          <button
            class="saved-name"
            disabled={busy || loading}
            onclick={() => choose(item)}
            >{item.name}<small>{item.layout} · {item.modes.join(' / ')}</small
            ></button
          ><button
            aria-label={`Duplicate ${item.name}`}
            disabled={busy || loading}
            onclick={() => duplicate(item)}
            ><Icon icon={mdiContentCopy} size="18px" /></button
          ><button
            aria-label={`Delete ${item.name}`}
            disabled={busy || loading}
            onclick={() => (pendingDelete = item)}
            ><Icon icon={mdiDeleteOutline} size="18px" /></button
          >
        </li>{/each}
    </ul>
    {#if cursor}<Button
        variant="ghost"
        disabled={loading}
        onclick={() => load(true)}>Load more themes</Button
      >{/if}
    <label>Theme name<input maxlength="100" bind:value={name} /></label>
    <div class="actions">
      <Button
        variant="ghost"
        disabled={busy || loading || !name.trim()}
        onclick={saveCurrent}>Save current design as theme</Button
      ><Button
        variant="ghost"
        disabled={busy}
        leadingIcon={mdiDownload}
        onclick={downloadCurrent}>Export current theme</Button
      >
    </div>
    {#if chosen}<div class="actions">
        <Button
          variant="ghost"
          leadingIcon={mdiPencilOutline}
          disabled={loading || !name.trim()}
          onclick={rename}>Rename selected theme</Button
        ><Button
          variant="ghost"
          onclick={() => chosen && download(chosen.definition)}
          >Export selected theme</Button
        >
      </div>{/if}
    {#if pendingDelete}<div role="alert" class="delete-confirm">
        <p>
          Delete “{pendingDelete.name}” from your library? Applied pages keep
          their designs.
        </p>
        <Button onclick={remove}>Delete saved theme</Button><Button
          variant="ghost"
          onclick={() => (pendingDelete = null)}>Keep theme</Button
        >
      </div>{/if}
  </section>
  <details class="import-panel">
    <summary>Import a ready-made theme</summary>
    <p>
      Use a complete Pager theme, or adapt web theme colors and typography to
      one of these page designs.
    </p>
    <label
      >Theme format<select
        bind:value={format}
        onchange={() => {
          imported = null;
        }}
        ><option value="native">Pager theme JSON</option><option value="shadcn"
          >shadcn / Tweakcn CSS</option
        ><option value="daisyui">daisyUI v5 CSS</option></select
      ></label
    >
    {#if format !== 'native'}<label
        >Page design<select bind:value={base} onchange={() => (imported = null)}
          >{#each builtInThemes as item}<option value={item.layout}
              >{item.name}</option
            >{/each}</select
        ></label
      ><label
        >Theme name within CSS (when several are included)<input
          bind:value={sourceName}
          oninput={() => (imported = null)}
        /></label
      ><label
        >Single-theme mode (if not declared)<select
          bind:value={singleMode}
          onchange={() => (imported = null)}
          ><option value="">Choose when needed</option><option value="light"
            >Light</option
          ><option value="dark">Dark</option></select
        ></label
      >{/if}
    <label
      >Theme file<input
        type="file"
        accept=".json,.css,application/json,text/css"
        onchange={readFile}
      /></label
    >
    <label
      >Theme source<textarea
        rows="7"
        maxlength={THEME_FILE_LIMIT}
        bind:value={source}
        oninput={() => (imported = null)}
        spellcheck="false"
      ></textarea></label
    >
    <Button variant="ghost" disabled={!source.trim()} onclick={inspect}
      >Review import</Button
    >
    {#if imported}<div class="import-review">
        <h3>{imported.name}</h3>
        <p>
          {recognized.length} recognized values · {Object.keys(
            imported.variants,
          ).join(' / ')}
        </p>
        <ul>
          {#each warnings as warning}<li>{warning}</li>{/each}
        </ul>
        <div class="actions">
          <Button variant="ghost" onclick={() => imported && tryTheme(imported)}
            >Try imported theme</Button
          ><Button
            variant="ghost"
            disabled={loading || !name.trim()}
            onclick={saveImported}>Save imported theme</Button
          >
        </div>
      </div>{/if}
  </details>
  {#if error}<p role="alert" class="error">{error}</p>
    <Button variant="ghost" onclick={() => load()}>Reload library</Button>{/if}
  {#if status}<p role="status">{status}</p>{/if}
</section>

<style>
  .themes {
    display: grid;
    gap: 24px;
    min-width: 0;
  }
  .intro p,
  .hint,
  small {
    color: var(--pager-management-text-secondary, #aaa);
    font-size: 0.875rem;
    line-height: 1.5;
  }
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .theme-card {
    text-align: start;
    border: 1px solid var(--pager-management-border, #444);
    background: transparent;
    color: inherit;
    border-radius: 12px;
    padding: 8px;
    min-width: 0;
    cursor: pointer;
  }
  .theme-card.active {
    border-color: var(--pager-management-accent, #accbfa);
  }
  .theme-card strong {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    font-size: 0.875rem;
    margin-block: 10px 4px;
  }
  .theme-card small {
    display: block;
    font-size: 0.75rem;
  }
  .theme-card:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--pager-management-accent, #accbfa);
    outline-offset: 3px;
  }
  .mini {
    position: relative;
    display: grid;
    height: 110px;
    background: var(--mini-bg);
    color: var(--mini-fg);
    padding: 12px;
    gap: 8px;
    overflow: hidden;
    border-radius: 6px;
  }
  .mini-heading {
    display: block;
    width: 65%;
    height: 9px;
    background: var(--mini-fg);
  }
  .mini-image {
    display: block;
    background: var(--mini-accent);
    opacity: 0.6;
    min-height: 30px;
  }
  .mini-photos {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }
  .mini-photos i {
    background: var(--mini-fg);
    opacity: 0.18;
    min-height: 20px;
  }
  .mini-studio {
    grid-template-columns: 1fr 1fr;
  }
  .mini-studio .mini-heading {
    align-self: center;
    width: 90%;
    height: 20px;
  }
  .mini-studio .mini-image {
    grid-column: 2;
    grid-row: 1/3;
  }
  .mini-cinematic .mini-image {
    position: absolute;
    inset: 0;
    opacity: 0.5;
  }
  .mini-cinematic .mini-heading {
    position: relative;
    align-self: end;
    height: 20px;
    z-index: 1;
  }
  .mini-cinematic .mini-photos {
    z-index: 1;
  }
  .mini-editorial .mini-heading {
    width: 95%;
    height: 15px;
    border-block: 2px solid var(--mini-accent);
    background: transparent;
  }
  .mini-archive {
    grid-template-columns: 25% 1fr;
  }
  .mini-archive .mini-heading {
    grid-row: 1/3;
    height: 65px;
    width: 100%;
  }
  .mini-archive .mini-photos {
    grid-template-columns: repeat(3, 1fr);
  }
  .mini-contact-sheet .mini-image {
    display: none;
  }
  .mini-contact-sheet .mini-photos {
    grid-template-columns: repeat(4, 1fr);
  }
  .mini-contact-sheet .mini-photos i {
    height: 65px;
  }
  .collection-card {
    min-width: 0;
    display: grid;
    gap: 8px;
  }
  .collection-card .theme-card {
    width: 100%;
    height: 100%;
  }
  .theme-download {
    font-size: 0.75rem;
    color: var(--pager-management-accent);
    padding: 4px 8px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  label {
    display: grid;
    gap: 8px;
    margin-block: 14px;
    font-size: 0.875rem;
  }
  input:not([type='checkbox']),
  textarea,
  select {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    background: var(--pager-management-surface-quiet, #111);
    color: inherit;
    border: 1px solid var(--pager-management-border, #555);
    border-radius: 8px;
    padding: 10px;
    font: inherit;
  }
  textarea {
    font-family: monospace;
    font-size: 0.8rem;
  }
  .import-review,
  .delete-confirm {
    padding: 16px;
    border: 1px solid var(--pager-management-border, #555);
    border-radius: 12px;
  }
  h2 {
    font-size: 1.1rem;
    margin-block: 0 12px;
  }
  h3 {
    font-size: 1rem;
    margin-block: 0 8px;
  }
  .saved-themes {
    list-style: none;
    padding: 0;
  }
  .saved-themes li {
    display: flex;
    gap: 4px;
    border-block-end: 1px solid var(--pager-management-border, #444);
    padding-block: 8px;
  }
  .saved-themes button {
    border: 0;
    color: inherit;
    background: transparent;
    cursor: pointer;
    padding: 8px;
  }
  .saved-name {
    flex: 1;
    text-align: start;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .saved-name small {
    display: block;
    font-size: 0.75rem;
  }
  .error {
    color: var(--pager-management-danger, #fca5a5);
  }
  summary {
    cursor: pointer;
    padding-block: 12px;
    font-weight: 600;
  }
  .import-review ul {
    padding-inline-start: 20px;
    font-size: 0.8rem;
    line-height: 1.6;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
