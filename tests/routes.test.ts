import { describe, expect, it } from 'vitest';
import config from '../svelte.config.js';
describe('companion namespace', () => {
  it('keeps app routes and generated assets under /page', () => {
    expect(config.kit.paths.base).toBe('/page');
    expect(config.kit.appDir).toBe('assets');
  });
});
