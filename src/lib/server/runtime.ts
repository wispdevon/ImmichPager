import { env } from '$env/dynamic/private';
import { join } from 'node:path';
import { Store } from './store';
import { Immich } from './immich';
import { PageService } from './pages';
import { credentialHeaders } from './security';

let store: Store | undefined;
export function database() {
  return store ??= new Store(join(env.DATA_DIR || 'data', 'pager.sqlite'));
}
export function upstream(request?: Request) {
  return new Immich(env.IMMICH_URL || 'http://127.0.0.1:2283', request ? credentialHeaders(request) : {});
}
export function service(request: Request) { return new PageService(database(), upstream(request)); }
