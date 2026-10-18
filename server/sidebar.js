// ImmichPager sidebar bridge. No credentials are read or stored by this script.
(() => {
  if (window.top !== window.self || window.__immichPager) return;
  window.__immichPager = true;
  let frame,
    hidden = [],
    originalTitle;
  function close() {
    frame?.remove();
    frame = undefined;
    for (const [node, display] of hidden) node.style.display = display;
    hidden = [];
    if (originalTitle) document.title = originalTitle;
  }
  function show() {
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
      'width:100%;height:calc(100dvh - 80px);border:0;display:block;background:#000;';
    main.append(frame);
    document.title = 'Pages · Immich';
    const mobileClose = document.querySelector('[aria-label="Close sidebar"]');
    mobileClose?.click();
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
        show();
      });
      reference.after(row);
    }
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
    if (location.hash === '#client-pages') show();
    else close();
  });
  new MutationObserver(install).observe(document.body, {
    childList: true,
    subtree: true,
  });
  install();
  if (location.hash === '#client-pages') show();
})();
