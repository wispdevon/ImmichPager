// Immich UI Modal currently labels its card, but does not forward the title to
// Dialog.Content. Name the containing dialog from its mounted body, retaining
// the library's focus handling, layout, and controls.
export function labelDialog(element: HTMLElement, label: string) {
  const dialog = element.closest('[role="dialog"]');
  const previous = dialog?.getAttribute('aria-label');
  dialog?.setAttribute('aria-label', label);
  return {
    update(value: string) {
      dialog?.setAttribute('aria-label', value);
    },
    destroy() {
      if (previous) dialog?.setAttribute('aria-label', previous);
      else dialog?.removeAttribute('aria-label');
    },
  };
}
