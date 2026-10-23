(() => {
  if (window.top !== window.self) return;
  let info;
  let requested = false;
  let pendingNotice = false;
  const dismissed = new Set();
  const key = () => `immichpager:update:${info.userId}:${info.latestVersion}`;
  function wasDismissed() {
    try {
      return (
        dismissed.has(key()) || localStorage.getItem(key()) === 'dismissed'
      );
    } catch {
      return dismissed.has(key());
    }
  }
  function addAbout() {
    if (!info) return;
    const nativeVersion = document.querySelector('#immich');
    const reference = nativeVersion?.parentElement;
    if (!reference?.querySelector('label[for="immich"]')) return;
    let item = reference.parentElement.querySelector('[data-pager-version]');
    if (item) return;
    item = reference.cloneNode(true);
    item.dataset.pagerVersion = 'true';
    const label = item.querySelector('label');
    label.htmlFor = 'immichpager-version';
    label.textContent = 'ImmichPager';
    const value = item.querySelector('#immich');
    value.id = 'immichpager-version';
    const link = value.querySelector('a') || document.createElement('a');
    link.textContent = `v${info.installedVersion}`;
    link.href = info.installedReleaseUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    value.replaceChildren(link);
    const status = document.createElement('div');
    status.style.cssText = 'font-size:0.85em;overflow-wrap:anywhere';
    if (info.updateAvailable) {
      const update = document.createElement('a');
      update.href = info.latestReleaseUrl;
      update.target = '_blank';
      update.rel = 'noopener noreferrer';
      update.textContent = `v${info.latestVersion} available`;
      status.append(update);
    }
    const suffix =
      info.status === 'stale'
        ? 'Update check unavailable; showing last result.'
        : info.status === 'unavailable'
          ? 'Update check unavailable.'
          : info.status === 'disabled'
            ? 'Update checks disabled.'
            : '';
    if (suffix)
      status.append(
        document.createTextNode(`${info.updateAvailable ? ' ' : ''}${suffix}`),
      );
    if (status.textContent) item.append(status);
    // Append before version history, preserving upstream-owned sibling order.
    const history =
      reference.parentElement.querySelector('#version-history')?.parentElement;
    if (history?.parentElement === reference.parentElement)
      history.before(item);
    else reference.parentElement.append(item);
  }
  function showNotice() {
    if (!pendingNotice || !info?.isAdmin || wasDismissed() || document.hidden)
      return;
    // Never steal focus from an editor, an existing overlay, or the Pages iframe.
    if (
      document.querySelector(
        'dialog[open], [role="dialog"], iframe[src^="/page/manage"]',
      ) ||
      document.activeElement?.matches(
        'input, textarea, select, [contenteditable="true"], iframe',
      )
    )
      return;
    pendingNotice = false;
    const dialog = document.createElement('dialog');
    dialog.dataset.pagerUpdate = 'true';
    dialog.setAttribute('aria-labelledby', 'pager-update-title');
    const dark = document.documentElement.classList.contains('dark');
    dialog.style.cssText = `background:${dark ? '#1b1b1f' : '#fff'};color:${dark ? '#e3e2e6' : '#1b1b1f'};border:0;border-radius:24px;padding:24px;width:min(440px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;font:inherit;box-shadow:0 12px 48px #0006;`;
    const title = document.createElement('h2');
    title.id = 'pager-update-title';
    title.textContent = 'ImmichPager update available';
    title.style.cssText = 'font-size:1.25rem;font-weight:500;margin:0 0 16px';
    const message = document.createElement('p');
    message.textContent = `Installed: v${info.installedVersion}. Latest: v${info.latestVersion}.`;
    const link = document.createElement('a');
    link.textContent = 'Read release notes';
    link.href = info.latestReleaseUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.cssText =
      'display:inline-block;text-decoration:underline;margin:16px 0';
    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end';
    const close = document.createElement('button');
    close.textContent = 'Dismiss';
    close.autofocus = true;
    close.style.cssText = `font:inherit;border:0;border-radius:24px;padding:10px 24px;cursor:pointer;background:${dark ? '#accbfa' : '#415f91'};color:${dark ? '#0a305f' : '#fff'};`;
    const dismissalKey = key();
    function rememberDismissal() {
      dismissed.add(dismissalKey);
      try {
        localStorage.setItem(dismissalKey, 'dismissed');
      } catch {
        /* Storage may be disabled. */
      }
    }
    // Persist before the deferred close event, including an immediate reload.
    close.addEventListener('click', () => {
      rememberDismissal();
      dialog.close();
    });
    dialog.addEventListener('cancel', rememberDismissal);
    dialog.addEventListener(
      'close',
      () => {
        rememberDismissal();
        dialog.remove();
      },
      { once: true },
    );
    footer.append(close);
    dialog.append(title, message, link, footer);
    document.body.append(dialog);
    dialog.showModal();
  }
  async function refresh() {
    if (!document.querySelector('#sidebar') || requested) return;
    requested = true;
    try {
      const response = await fetch('/page/api/version', {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        info = undefined;
        pendingNotice = false;
        return;
      }
      info = await response.json();
      document.querySelector('[data-pager-version]')?.remove();
      pendingNotice =
        info.isAdmin && info.updateAvailable && info.status === 'available';
      addAbout();
      showNotice();
    } catch {
      /* Version awareness must not disrupt Immich. */
    } finally {
      requested = false;
    }
  }
  let initial = false;
  new MutationObserver(() => {
    if (!initial && document.querySelector('#sidebar')) {
      initial = true;
      void refresh();
    }
    addAbout();
  }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void refresh();
  });
  setInterval(
    () => {
      if (!document.hidden) void refresh();
    },
    60 * 60 * 1000,
  );
  setInterval(showNotice, 15000);
  if (document.querySelector('#sidebar')) {
    initial = true;
    void refresh();
  }
})();
