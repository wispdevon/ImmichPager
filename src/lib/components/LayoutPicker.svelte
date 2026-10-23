<script lang="ts">
  import { Icon } from '@immich/ui';
  import { mdiCheck } from '@mdi/js';
  let {
    label,
    value,
    options,
    onchange,
  }: {
    label: string;
    value: string;
    options: { value: string; label: string; description: string }[];
    onchange: (value: string) => void;
  } = $props();
  const id = $props.id();
</script>

<div role="radiogroup" aria-label={label} class="layout-picker">
  {#each options as option}
    <label
      class="choice"
      class:chosen={value === option.value}
      title={option.description}
    >
      <input
        type="radio"
        name={id}
        value={option.value}
        checked={value === option.value}
        onchange={() => onchange(option.value)}
        aria-label={option.label}
      />
      <span class="thumbnail {option.value}" aria-hidden="true"
        >{#each [1, 2, 3, 4, 5, 6] as item}<span class="tile tile-{item}"
          ></span>{/each}</span
      >
      <span class="caption"
        >{option.label}{#if value === option.value}<span class="selected-check"
            ><Icon icon={mdiCheck} size="14px" aria-hidden /></span
          >{/if}</span
      >
      <span class="visually-hidden">{option.description}</span>
    </label>
  {/each}
</div>

<style>
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .layout-picker {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    min-width: 0;
  }
  .choice {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 7px;
    border: 1px solid var(--pager-management-border, #333);
    border-radius: 12px;
    min-width: 0;
    cursor: pointer;
  }
  .choice.chosen {
    background: var(--pager-management-selected, #accbfa15);
    border-color: var(--pager-management-accent, #accbfa);
    box-shadow: 0 0 0 1px var(--pager-management-accent, #accbfa);
  }
  .choice:has(input:focus-visible) {
    outline: 2px solid var(--pager-management-accent, #accbfa);
    outline-offset: 3px;
  }
  input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }
  .thumbnail {
    height: 58px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(2, 1fr);
    gap: 4px;
    padding: 5px;
    background: #8881;
    border-radius: 6px;
    overflow: hidden;
  }
  .tile {
    background: #8887;
    border-radius: 2px;
    position: relative;
  }
  .cards .tile::after,
  .tiles .tile::after {
    content: '';
    position: absolute;
    bottom: 3px;
    left: 2px;
    width: 60%;
    height: 2px;
    background: var(--pager-management-accent, #accbfa);
  }
  .cards .tile {
    margin-bottom: 4px;
  }
  .cards .tile::after {
    bottom: -4px;
  }
  .tiles {
    grid-template-rows: 1fr;
  }
  .tiles .tile:nth-child(n + 4),
  .editorial .tile:nth-child(n + 5),
  .large .tile:nth-child(n + 3),
  .carousel .tile:nth-child(n + 4) {
    display: none;
  }
  .editorial {
    grid-template-columns: 1fr 1fr;
  }
  .editorial .tile:nth-child(even) {
    height: 4px;
    align-self: center;
    background: var(--pager-management-accent, #accbfa);
  }
  .masonry .tile:nth-child(2),
  .masonry .tile:nth-child(5) {
    transform: translateY(5px);
  }
  .justified {
    grid-template-columns: 1.5fr 1fr 1.2fr;
  }
  .large {
    grid-template-columns: 1fr;
  }
  .carousel {
    grid-template-rows: 1fr;
    grid-template-columns: 1fr 1fr 0.3fr;
  }
  .selected-check {
    position: absolute;
    top: 5px;
    right: 5px;
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    color: var(--pager-management-background, #000);
    background: var(--pager-management-accent, #accbfa);
  }
  .caption {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    font-size: 12px;
    line-height: 20px;
    white-space: nowrap;
  }
</style>
