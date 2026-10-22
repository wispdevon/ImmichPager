export type HostTheme = 'light' | 'dark';

const IMMICH_THEME_KEY = 'immich-ui-theme';
const THEME_QUERY = '(prefers-color-scheme: dark)';

export function isManagementEditorPath(pathname: string): boolean {
  return (
    /^\/page\/manage(?:\/|$)/.test(pathname) &&
    !/^\/page\/manage\/[^/]+\/preview\/?$/.test(pathname)
  );
}

export function parseImmichThemePreference(
  value: string | null,
): HostTheme | null {
  if (value === null) return null;
  try {
    const preference: unknown = JSON.parse(value);
    return preference === 'light' || preference === 'dark' ? preference : null;
  } catch {
    return null;
  }
}

export function resolveHostTheme(
  preference: HostTheme | null,
  prefersDark: boolean,
): HostTheme {
  return preference ?? (prefersDark ? 'dark' : 'light');
}

function themeFromRoot(root: HTMLElement): HostTheme | null {
  const dark = root.classList.contains('dark');
  const light = root.classList.contains('light');
  if (dark === light) return null;
  return dark ? 'dark' : 'light';
}

function sameOriginParentRoot(): HTMLElement | null {
  if (window.parent === window) return null;
  try {
    return window.parent.document.documentElement;
  } catch {
    return null;
  }
}

function storedPreference(): HostTheme | null {
  try {
    return parseImmichThemePreference(
      window.localStorage.getItem(IMMICH_THEME_KEY),
    );
  } catch {
    return null;
  }
}

function applyTheme(root: HTMLElement, theme: HostTheme) {
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  root.dataset.pagerHostTheme = theme;
}

declare global {
  interface Window {
    __immichPagerInitialTheme?: {
      path: string;
      dark: boolean;
      light: boolean;
      hostTheme: string | null;
    };
  }
}

/** Follow Immich's same-origin root theme while the management surface is mounted. */
export function installHostTheme(): () => void {
  const root = document.documentElement;
  const initial = window.__immichPagerInitialTheme;
  const restore =
    initial?.path === window.location.pathname
      ? initial
      : {
          dark: root.classList.contains('dark'),
          light: root.classList.contains('light'),
          hostTheme: root.getAttribute('data-pager-host-theme'),
        };
  delete window.__immichPagerInitialTheme;

  const parentRoot = sameOriginParentRoot();
  const media = window.matchMedia(THEME_QUERY);
  const sync = () => {
    const theme =
      (parentRoot && themeFromRoot(parentRoot)) ??
      resolveHostTheme(storedPreference(), media.matches);
    applyTheme(root, theme);
  };
  const observer = parentRoot ? new MutationObserver(sync) : undefined;
  observer?.observe(parentRoot!, {
    attributes: true,
    attributeFilter: ['class'],
  });
  const onStorage = (event: StorageEvent) => {
    if (event.key === IMMICH_THEME_KEY || event.key === null) sync();
  };

  sync();
  window.addEventListener('storage', onStorage);
  media.addEventListener('change', sync);

  return () => {
    observer?.disconnect();
    window.removeEventListener('storage', onStorage);
    media.removeEventListener('change', sync);
    root.classList.remove('dark', 'light');
    if (restore.dark) root.classList.add('dark');
    if (restore.light) root.classList.add('light');
    if (restore.hostTheme === null)
      root.removeAttribute('data-pager-host-theme');
    else root.setAttribute('data-pager-host-theme', restore.hostTheme);
  };
}
