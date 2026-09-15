export const THEME_STORAGE_KEY = 'festy-theme';

export function normalizeTheme(theme) {
  return theme === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme) {
  const next = normalizeTheme(theme);
  const root = document.documentElement;
  root.classList.toggle('dark', next === 'dark');
  root.dataset.theme = next;
  root.style.colorScheme = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* ignore quota / private mode */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = next === 'dark' ? '#111827' : '#e2e8f0';
}
