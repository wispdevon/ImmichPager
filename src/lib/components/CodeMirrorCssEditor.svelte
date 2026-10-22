<script lang="ts">
  import { onMount } from 'svelte';
  import { CUSTOM_CSS_LIMIT } from '$lib/custom-css';

  let {
    value = $bindable(''),
    invalid = false,
  }: { value: string; invalid?: boolean } = $props();

  let mountPoint: HTMLDivElement;
  let loadError = $state('');
  let editor = $state.raw<import('@codemirror/view').EditorView | null>(null);

  onMount(() => {
    let active = true;

    async function mountEditor() {
      try {
        const [state, view, commands, cssLanguage, language, highlight] =
          await Promise.all([
            import('@codemirror/state'),
            import('@codemirror/view'),
            import('@codemirror/commands'),
            import('@codemirror/lang-css'),
            import('@codemirror/language'),
            import('@lezer/highlight'),
          ]);

        if (!active) return;

        const colors = language.HighlightStyle.define([
          {
            tag: highlight.tags.comment,
            color: 'var(--pager-management-text-secondary)',
          },
          {
            tag: highlight.tags.keyword,
            color: 'var(--pager-management-accent)',
          },
          {
            tag: highlight.tags.propertyName,
            color: 'var(--pager-management-text)',
          },
          {
            tag: highlight.tags.string,
            color: 'var(--pager-management-success)',
          },
          {
            tag: highlight.tags.number,
            color: 'var(--pager-management-warning)',
          },
          {
            tag: highlight.tags.color,
            color: 'var(--pager-management-accent)',
          },
          {
            tag: highlight.tags.typeName,
            color: 'var(--pager-management-warning)',
          },
        ]);
        const limit = state.EditorState.transactionFilter.of((transaction) =>
          transaction.newDoc.length > CUSTOM_CSS_LIMIT ? [] : transaction,
        );
        const editorTheme = view.EditorView.theme({
          '&': {
            color: 'var(--pager-management-text)',
            backgroundColor: 'var(--pager-management-background)',
            fontSize: '13px',
          },
          '.cm-content': {
            caretColor: 'var(--pager-management-accent)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            padding: '12px',
          },
          '&.cm-focused': {
            outline: '2px solid var(--pager-management-focus)',
            outlineOffset: '2px',
          },
          '.cm-gutters': {
            color: 'var(--pager-management-text-secondary)',
            backgroundColor: 'var(--pager-management-surface)',
            border: 'none',
            borderInlineEnd: '1px solid var(--pager-management-border)',
          },
          '.cm-activeLine': {
            backgroundColor: 'var(--pager-management-surface-quiet)',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'var(--pager-management-surface-raised)',
          },
          '.cm-selectionBackground': {
            backgroundColor:
              'color-mix(in srgb, var(--pager-management-accent) 32%, transparent)',
          },
        });

        editor = new view.EditorView({
          parent: mountPoint,
          state: state.EditorState.create({
            doc: value,
            extensions: [
              cssLanguage.css(),
              view.lineNumbers(),
              view.EditorView.lineWrapping,
              limit,
              language.syntaxHighlighting(colors),
              editorTheme,
              view.EditorView.contentAttributes.of({
                'aria-label': 'Custom CSS',
                'aria-invalid': String(invalid),
                'aria-describedby': 'css-feedback css-count',
                spellcheck: 'false',
                autocapitalize: 'off',
                role: 'textbox',
                'aria-multiline': 'true',
              }),
              commands.history(),
              view.keymap.of([
                ...commands.defaultKeymap,
                ...commands.historyKeymap,
              ]),
              view.EditorView.updateListener.of((update) => {
                if (update.docChanged) value = update.state.doc.toString();
              }),
            ],
          }),
        });
      } catch {
        if (active) loadError = 'The CSS editor could not be loaded.';
      }
    }

    void mountEditor();
    return () => {
      active = false;
      editor?.destroy();
      editor = null;
    };
  });

  $effect(() => {
    const current = value;
    const view = editor;
    if (!view || view.state.doc.toString() === current) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: current },
    });
  });

  $effect(() => {
    const view = editor;
    if (!view) return;
    view.contentDOM.setAttribute('aria-invalid', String(invalid));
  });
</script>

<div class="editor-shell" class:invalid bind:this={mountPoint}></div>
{#if loadError}<p class="load-error" role="alert">{loadError}</p>{/if}

<style>
  .editor-shell {
    min-block-size: 15rem;
    border: 1px solid var(--pager-management-border);
    border-radius: 8px;
    overflow: clip;
    background: var(--pager-management-background);
  }

  .editor-shell:global(.invalid) {
    border-color: var(--pager-management-danger);
  }

  .editor-shell :global(.cm-editor) {
    min-block-size: 15rem;
  }

  .editor-shell :global(.cm-scroller) {
    overflow: auto;
    font: inherit;
  }

  .editor-shell :global(.cm-content) {
    min-block-size: 14rem;
  }

  .load-error {
    color: var(--pager-management-danger);
    font-size: 13px;
  }
</style>
