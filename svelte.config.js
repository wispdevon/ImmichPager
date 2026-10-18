import adapter from '@sveltejs/adapter-node';
export default {
  kit: {
    paths: { base: '/page' },
    appDir: 'assets',
    adapter: adapter(),
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'blob:', 'data:'],
        'connect-src': ['self'],
        'frame-ancestors': ['self'],
        'form-action': ['self'],
        'base-uri': ['self'],
      },
    },
  },
};
