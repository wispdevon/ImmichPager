import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { VersionChecker } from './version';
export const versions = new VersionChecker(
  env.PAGER_UPDATE_CHECK_ENABLED !== 'false',
);
if (!building && env.PAGER_UPDATE_CHECK_ENABLED !== 'false') {
  void versions.check();
  setInterval(
    () => {
      void versions.check();
    },
    60 * 60 * 1000,
  ).unref();
}
