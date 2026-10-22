import { describe, expect, it } from 'vitest';
import {
  isManagementEditorPath,
  parseImmichThemePreference,
  resolveHostTheme,
} from '../src/lib/host-theme';

describe('Immich host theme resolution', () => {
  it.each([
    ['"light"', 'light'],
    ['"dark"', 'dark'],
    ['"system"', null],
    ['light', null],
    ['null', null],
    ['{', null],
    [null, null],
  ])('accepts only Immich light/dark preferences (%s)', (stored, expected) => {
    expect(parseImmichThemePreference(stored)).toBe(expected);
  });

  it.each([
    [null, true, 'dark'],
    [null, false, 'light'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
  ] as const)(
    'uses the system theme only when no explicit preference exists',
    (preference, prefersDark, expected) => {
      expect(resolveHostTheme(preference, prefersDark)).toBe(expected);
    },
  );

  it('only attaches host theme to management screens, not galleries or public slugs', () => {
    expect(isManagementEditorPath('/page/manage')).toBe(true);
    expect(isManagementEditorPath('/page/manage/')).toBe(true);
    expect(isManagementEditorPath('/page/manage/new')).toBe(true);
    expect(
      isManagementEditorPath('/page/manage/7b0e87a0-65b6-49ad-a66d/preview'),
    ).toBe(false);
    expect(isManagementEditorPath('/page/management-client')).toBe(false);
    expect(isManagementEditorPath('/page/acme')).toBe(false);
  });
});
