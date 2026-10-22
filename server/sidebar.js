// ImmichPager sidebar bridge. No credentials are read or stored by this script.
(() => {
  if (window.top !== window.self || window.__immichPager) return;
  window.__immichPager = true;
  let frame,
    hidden = [],
    originalTitle,
    opener;
  let hostInteractionRevision = 0;
  const activeClasses = ['bg-primary/10', 'text-primary'];
  const navigationState = new Map();
  const trackHostInteraction = () => {
    hostInteractionRevision += 1;
  };
  for (const eventName of ['focusin', 'keydown', 'pointerdown'])
    document.addEventListener(eventName, trackHostInteraction, true);
  const sidebars = () => document.querySelectorAll('#sidebar');
  function rememberNavigation(sidebar) {
    for (const link of sidebar.querySelectorAll('a[href]')) {
      if (navigationState.has(link)) continue;
      navigationState.set(link, {
        current: link.getAttribute('aria-current'),
        classes: activeClasses.map((name) => link.classList.contains(name)),
      });
    }
  }
  function showPagesAsActive() {
    for (const [link] of navigationState) {
      if (!link.isConnected) navigationState.delete(link);
    }
    for (const sidebar of sidebars()) {
      rememberNavigation(sidebar);
      for (const link of sidebar.querySelectorAll('a[href]')) {
        link.removeAttribute('aria-current');
        link.classList.remove(...activeClasses);
      }
      const pageLink = sidebar.querySelector('[data-pager-link]');
      if (pageLink) {
        pageLink.setAttribute('aria-current', 'page');
        pageLink.classList.add(...activeClasses);
      }
    }
  }
  function restoreNavigation() {
    for (const [link, state] of navigationState) {
      if (!link.isConnected) continue;
      if (state.current === null) link.removeAttribute('aria-current');
      else link.setAttribute('aria-current', state.current);
      activeClasses.forEach((name, index) =>
        link.classList.toggle(name, state.classes[index]),
      );
    }
    navigationState.clear();
  }
  function focusUsableTarget(target) {
    if (target?.isConnected && target.getClientRects().length) {
      target.focus();
      if (document.activeElement === target) return;
    }
    const main = document.querySelector('#main, main');
    if (!main) return;
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
  }
  function closeMobileSidebar() {
    const sidebar = document.querySelector('#sidebar');
    const menuButton = document.querySelector('#top-menu-button');
    if (!sidebar || sidebar.inert || !menuButton?.getClientRects().length)
      return;
    menuButton.click();
  }
  function close({ restoreFocus = false } = {}) {
    const wasOpen = Boolean(frame);
    frame?.remove();
    frame = undefined;
    for (const [node, display] of hidden) node.style.display = display;
    hidden = [];
    restoreNavigation();
    if (originalTitle !== undefined) document.title = originalTitle;
    originalTitle = undefined;
    const previousOpener = opener;
    opener = undefined;
    if (restoreFocus && wasOpen) {
      const focusTarget = previousOpener?.isConnected
        ? previousOpener
        : document.querySelector('[data-pager-link]');
      focusUsableTarget(focusTarget);
    }
  }
  function show({ focus = false, source } = {}) {
    close();
    const main = document.querySelector('#main, main');
    if (!main) {
      location.assign('/page/manage');
      return;
    }
    originalTitle = document.title;
    for (const child of main.children) {
      hidden.push([child, child.style.display]);
      child.style.display = 'none';
    }
    frame = document.createElement('iframe');
    frame.src = '/page/manage';
    frame.title = 'Client pages';
    frame.style.cssText =
      'width:100%;height:calc(100dvh - 80px);border:0;display:block;background:transparent;';
    frame.tabIndex = 0;
    const currentFrame = frame;
    const shouldFocus = focus;
    closeMobileSidebar();
    const interactionRevisionAtShow = hostInteractionRevision;
    currentFrame.addEventListener('load', () => {
      if (
        !shouldFocus ||
        frame !== currentFrame ||
        hostInteractionRevision !== interactionRevisionAtShow
      )
        return;
      const contentMain = currentFrame.contentDocument?.querySelector('main');
      if (contentMain) {
        if (!contentMain.hasAttribute('tabindex'))
          contentMain.setAttribute('tabindex', '-1');
        contentMain.focus({ preventScroll: true });
      } else currentFrame.focus({ preventScroll: true });
    });
    main.append(frame);
    opener = source instanceof HTMLElement ? source : null;
    document.title = 'Pages · Immich';
    showPagesAsActive();
  }
  function install() {
    for (const sharing of document.querySelectorAll('a[href="/sharing"]')) {
      const sidebar = sharing.closest('#sidebar');
      if (!sidebar || sidebar.querySelector('[data-pager-row]')) continue;
      // NavbarItem wraps its link in a horizontal flex row. Clone the whole
      // item so Pages gets its own full-width row rather than sharing that flex.
      let reference = sharing;
      while (
        reference.parentElement &&
        reference.parentElement !== sidebar &&
        reference.parentElement.querySelectorAll('a[href]').length === 1
      )
        reference = reference.parentElement;
      const row = reference.cloneNode(true);
      row.dataset.pagerRow = 'true';
      row.removeAttribute('id');
      for (const child of row.querySelectorAll('[id]'))
        child.removeAttribute('id');
      const link = row.matches('a') ? row : row.querySelector('a[href]');
      link.href = '/page/manage';
      link.dataset.pagerLink = 'true';
      link.removeAttribute('aria-current');
      link.classList.remove('bg-primary/10', 'text-primary');
      // Preserve Immich's sidebar spacing and icon presentation.
      const labels = [...link.querySelectorAll('span')].filter(
        (node) => !node.querySelector('svg') && node.textContent.trim(),
      );
      if (labels.length) labels[labels.length - 1].textContent = 'Pages';
      else link.textContent = 'Pages';
      link.setAttribute('aria-label', 'Pages');
      link.addEventListener('click', (event) => {
        if (
          event.button ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        history.pushState({ pager: true }, '', '#client-pages');
        show({ focus: event.detail === 0, source: link });
      });
      reference.after(row);
    }
    if (frame) showPagesAsActive();
  }
  document.addEventListener(
    'click',
    (event) => {
      const link = event.target.closest?.('a');
      if (link && !link.dataset.pagerLink && frame) close();
    },
    true,
  );
  window.addEventListener('popstate', () => {
    if (location.hash === '#client-pages')
      show({
        focus: true,
        source: document.querySelector('[data-pager-link]'),
      });
    else close({ restoreFocus: true });
  });
  new MutationObserver(install).observe(document.body, {
    childList: true,
    subtree: true,
  });
  install();
  if (location.hash === '#client-pages') show();
})();
