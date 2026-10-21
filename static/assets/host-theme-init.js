// Match Immich's root theme before first paint in management routes only.
// The only preference read is Immich's documented visual setting, never auth data.
(() => {
  if (
    !/^\/page\/manage(?:\/|$)/.test(location.pathname) ||
    /^\/page\/manage\/[^/]+\/preview\/?$/.test(location.pathname)
  )
    return;

  const root = document.documentElement;
  window.__immichPagerInitialTheme = {
    path: location.pathname,
    dark: root.classList.contains('dark'),
    light: root.classList.contains('light'),
    hostTheme: root.getAttribute('data-pager-host-theme'),
  };

  let parentRoot = null;
  if (window.parent !== window) {
    try {
      parentRoot = window.parent.document.documentElement;
    } catch {
      // A different-origin host cannot expose its DOM; use the standalone fallback.
    }
  }

  const fromRoot = (element) => {
    const dark = element.classList.contains('dark');
    const light = element.classList.contains('light');
    if (dark === light) return null;
    return dark ? 'dark' : 'light';
  };

  const fromPreference = () => {
    try {
      const preference = JSON.parse(
        window.localStorage.getItem('immich-ui-theme'),
      );
      if (preference === 'light' || preference === 'dark') return preference;
    } catch {
      // Missing, malformed, or unavailable preferences use the system setting.
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  };

  const theme = (parentRoot && fromRoot(parentRoot)) || fromPreference();
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  root.dataset.pagerHostTheme = theme;
})();
