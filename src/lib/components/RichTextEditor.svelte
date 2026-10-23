<script lang="ts">
  import { Icon } from '@immich/ui';
  import {
    mdiFormatBold,
    mdiFormatItalic,
    mdiFormatHeader2,
    mdiFormatListBulleted,
    mdiFormatListNumbered,
    mdiLinkVariant,
    mdiLinkVariantOff,
  } from '@mdi/js';
  import { onMount } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import { richTextSchema, safeLink, type RichNode } from '$lib/blocks';
  let {
    value,
    onchange,
  }: { value: RichNode; onchange: (value: RichNode) => void } = $props();
  let host: HTMLDivElement;
  let editor = $state<Editor | null>(null);
  let linkOpen = $state(false),
    link = $state(''),
    error = $state('');
  function clean(node: RichNode): RichNode {
    return {
      type: node.type,
      ...(node.text !== undefined ? { text: node.text } : {}),
      ...(node.type === 'heading'
        ? { attrs: { level: node.attrs?.level ?? 2 } }
        : {}),
      ...(node.content ? { content: node.content.map(clean) } : {}),
      ...(node.marks
        ? {
            marks: node.marks.map((m) =>
              m.type === 'link'
                ? { type: m.type, attrs: { href: m.attrs?.href ?? '' } }
                : { type: m.type },
            ),
          }
        : {}),
    };
  }
  onMount(() => {
    const instance = new Editor({
      element: host,
      extensions: [
        StarterKit.configure({
          blockquote: false,
          code: false,
          codeBlock: false,
          horizontalRule: false,
          strike: false,
          underline: false,
          heading: { levels: [2, 3] },
          link: { openOnClick: false, autolink: false, linkOnPaste: false },
        }),
      ],
      content: value,
      editorProps: {
        attributes: {
          'aria-label': 'Text block content',
          role: 'textbox',
          'aria-multiline': 'true',
        },
      },
      onUpdate: ({ editor: current }) => {
        const parsed = richTextSchema.safeParse(
          clean(current.getJSON() as RichNode),
        );
        if (parsed.success) {
          error = '';
          onchange(parsed.data);
        } else error = 'This text exceeds the supported formatting or size.';
      },
    });
    editor = instance;
    return () => instance.destroy();
  });
  $effect(() => {
    if (
      editor &&
      !editor.isFocused &&
      JSON.stringify(clean(editor.getJSON() as RichNode)) !==
        JSON.stringify(value)
    )
      editor.commands.setContent(value, { emitUpdate: false });
  });
  function applyLink() {
    if (!safeLink(link)) {
      error = 'Use an http, https or mailto link.';
      return;
    }
    editor
      ?.chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: link })
      .run();
    linkOpen = false;
    error = '';
  }
</script>

<div class="rich-editor">
  <div
    class="formatting"
    data-pager-editor-ui
    role="group"
    aria-label="Text formatting"
  >
    <button
      onmousedown={(event) => event.preventDefault()}
      aria-label="Bold"
      onclick={() => editor?.chain().focus().toggleBold().run()}
      ><Icon icon={mdiFormatBold} size="20px" aria-hidden /></button
    >
    <button
      onmousedown={(event) => event.preventDefault()}
      aria-label="Italic"
      onclick={() => editor?.chain().focus().toggleItalic().run()}
      ><Icon icon={mdiFormatItalic} size="20px" aria-hidden /></button
    >
    <button
      onmousedown={(event) => event.preventDefault()}
      aria-label="Heading"
      title="Heading"
      onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
      ><Icon icon={mdiFormatHeader2} size="20px" aria-hidden /></button
    >
    <button
      onmousedown={(event) => event.preventDefault()}
      aria-label="Bullet list"
      title="Bullet list"
      onclick={() => editor?.chain().focus().toggleBulletList().run()}
      ><Icon icon={mdiFormatListBulleted} size="20px" aria-hidden /></button
    >
    <button
      onmousedown={(event) => event.preventDefault()}
      aria-label="Numbered list"
      title="Numbered list"
      onclick={() => editor?.chain().focus().toggleOrderedList().run()}
      ><Icon icon={mdiFormatListNumbered} size="20px" aria-hidden /></button
    >
    <button
      onmousedown={(event) => event.preventDefault()}
      aria-label="Link"
      title="Link"
      onclick={() => {
        linkOpen = !linkOpen;
        link = editor?.getAttributes('link').href ?? '';
      }}><Icon icon={mdiLinkVariant} size="20px" aria-hidden /></button
    >
    <button
      onmousedown={(event) => event.preventDefault()}
      aria-label="Unlink"
      title="Unlink"
      onclick={() => editor?.chain().focus().unsetLink().run()}
      ><Icon icon={mdiLinkVariantOff} size="20px" aria-hidden /></button
    >
  </div>
  {#if linkOpen}<form
      data-pager-editor-ui
      onsubmit={(event) => {
        event.preventDefault();
        applyLink();
      }}
    >
      <label
        >Link address <input
          type="url"
          bind:value={link}
          placeholder="https://"
        /></label
      ><button>Apply link</button>
    </form>{/if}
  <div class="text-content" bind:this={host}></div>
  {#if error}<p role="alert">{error}</p>{/if}
</div>

<style>
  .rich-editor {
    min-width: 0;
  }
  .formatting {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px;
    border: 1px solid #8885;
    border-radius: 8px;
    margin-bottom: 12px;
  }
  button,
  input {
    font: inherit;
    color: inherit;
    background: transparent;
    border: 1px solid #8886;
    border-radius: 4px;
    padding: 6px 10px;
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    min-height: 32px;
    cursor: pointer;
  }
  button:hover {
    background: #8882;
  }
  button:focus-visible {
    outline: 2px solid currentColor;
  }
  form {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 8px 0;
  }
  .text-content :global(.tiptap) {
    padding: 8px 0;
    min-height: 80px;
    outline: none;
  }
  .text-content :global(.tiptap:focus-visible) {
    outline: 1px dashed currentColor;
    outline-offset: 6px;
  }
  .text-content :global(p) {
    white-space: pre-wrap;
  }
</style>
