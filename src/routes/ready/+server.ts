import { json } from '@sveltejs/kit';
import { database, upstream } from '$lib/server/runtime';
export const GET = async () => {
  try {
    database().db.prepare('SELECT 1').get();
    await upstream().request('server/version', {}, {});
    return json({ status: 'ready' });
  } catch {
    return json({ status: 'not-ready' }, { status: 503 });
  }
};
