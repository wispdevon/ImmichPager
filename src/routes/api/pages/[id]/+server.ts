import type { RequestHandler } from './$types';
import { api, body } from '$lib/server/http';
import { database, service } from '$lib/server/runtime';
import { editorPage, parsePageInput } from '$lib/contracts';
export const GET: RequestHandler = event => api(event, owner => editorPage(database().owned(event.params.id, owner)));
export const PUT: RequestHandler = event => api(event, async owner => editorPage(await service(event.request).save(owner, event.params.id, parsePageInput(await body(event.request)))));
export const DELETE: RequestHandler = event => api(event, async owner => { await service(event.request).remove(owner, event.params.id); return { deleted: true }; });
