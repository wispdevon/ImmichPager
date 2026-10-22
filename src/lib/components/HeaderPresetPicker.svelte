<script lang="ts">
  import { headerPresets, type HeaderPreset } from '$lib/appearance-presets';
  import type { PageInput } from '$lib/contracts';

  let {
    fields,
    onSelect,
  }: { fields: PageInput; onSelect: (preset: HeaderPreset) => void } = $props();

  function matches(preset: HeaderPreset) {
    return Object.entries(preset.appearance).every(
      ([key, value]) =>
        fields[key as keyof HeaderPreset['appearance']] === value,
    );
  }
</script>

<ul role="list" aria-label="Header presets">
  {#each headerPresets as preset (preset.id)}
    <li>
      <button
        type="button"
        aria-pressed={matches(preset)}
        aria-label={`${preset.label}: ${preset.description}`}
        title={preset.description}
        onclick={() => onSelect(preset)}
      >
        <span class="thumbnail {preset.id}" aria-hidden="true">
          <span class="banner"></span>
          <span class="composition">
            <span class="logo"></span>
            <span class="title"></span>
            <span class="description"></span>
          </span>
        </span>
        <span class="caption"
          >{preset.label}<span class="selected" aria-hidden="true"
            >{matches(preset) ? '✓' : ''}</span
          ></span
        >
      </button>
    </li>
  {/each}
</ul>

<style>
  ul {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  button {
    width: 100%;
    padding: 6px;
    border: 2px solid var(--pager-management-border);
    border-radius: 12px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
  }
  button:hover {
    background: var(--pager-management-surface-quiet);
  }
  button[aria-pressed='true'] {
    border-color: var(--pager-management-accent);
    background: color-mix(
      in srgb,
      var(--pager-management-accent) 15%,
      transparent
    );
  }
  button:focus-visible {
    outline: 2px solid var(--pager-management-focus);
    outline-offset: 3px;
  }
  .thumbnail {
    position: relative;
    display: block;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    border-radius: 7px;
    background: var(--pager-management-surface-quiet);
  }
  .banner {
    position: absolute;
    inset: 0 0 auto;
    height: 30%;
    background: color-mix(in srgb, currentColor 24%, transparent);
  }
  .composition {
    position: absolute;
    inset: 40% 12% 12%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 5px;
  }
  .logo {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    background: var(--pager-management-accent);
  }
  .title {
    width: 78%;
    height: 5px;
    background: var(--pager-management-accent);
    border-radius: 1px;
  }
  .description {
    width: 52%;
    height: 3px;
    background: color-mix(in srgb, currentColor 45%, transparent);
    border-radius: 1px;
  }
  .centered .composition,
  .editorial .composition {
    align-items: center;
  }
  .editorial .banner {
    height: 100%;
  }
  .editorial .composition {
    inset: 12%;
  }
  .editorial .logo {
    width: 16px;
    height: 16px;
  }
  .caption {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 3px;
    min-height: 30px;
    font-size: 12px;
    font-weight: 600;
  }
  .selected {
    width: 9px;
    font-size: 11px;
  }
</style>
