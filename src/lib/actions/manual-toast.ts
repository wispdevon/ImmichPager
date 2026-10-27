/** Promote feedback without light dismiss; older browsers retain the fixed-position fallback. */
export function manualToast(node: HTMLDivElement) {
  const native =
    'popover' in HTMLElement.prototype &&
    typeof node.showPopover === 'function';
  if (native) {
    node.popover = 'manual';
    node.showPopover();
  }
  return {
    destroy() {
      if (native && node.matches(':popover-open')) node.hidePopover();
    },
  };
}
