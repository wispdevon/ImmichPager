<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Icon } from '@immich/ui';
  import { mdiChevronDown } from '@mdi/js';
  let {
    group,
    title,
    icon,
    value,
    open = $bindable(false),
    children,
  }: {
    group: string;
    title: string;
    icon: string;
    value: string;
    open?: boolean;
    children: Snippet;
  } = $props();
</script>

<details class="design-group" data-design-group={group} bind:open>
  <summary>
    <Icon {icon} size="20px" aria-hidden />
    <span class="group-copy"
      ><span class="group-title">{title}</span><span class="group-value"
        >{value}</span
      ></span
    ><span class="chevron"
      ><Icon icon={mdiChevronDown} size="18px" aria-hidden /></span
    >
  </summary>
  <div class="group-controls">{@render children()}</div>
</details>

<style>
  details {
    border-bottom: 1px solid var(--pager-management-border);
  }
  summary {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 64px;
    padding: 10px 0;
    box-sizing: border-box;
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary:focus-visible {
    outline: 2px solid var(--pager-management-focus);
    outline-offset: 2px;
    border-radius: 6px;
  }
  .group-copy {
    display: grid;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }
  .group-title {
    font-size: 14px;
    font-weight: 600;
  }
  .group-value {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 12px;
    color: var(--pager-management-text-secondary);
  }
  .chevron {
    display: flex;
  }
  details[open] .chevron {
    rotate: 180deg;
  }
  .group-controls {
    display: grid;
    gap: 16px;
    padding: 8px 0 24px;
  }
</style>
