import type { RequestHandler } from './$types';
import { api } from '$lib/server/http';
import { upstream } from '$lib/server/runtime';
export const GET: RequestHandler = event => api(event, async owner => (await upstream(event.request).albums()).filter(a => a.ownerId === owner));
