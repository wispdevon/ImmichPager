import { json, type RequestEvent } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { AppError } from '../contracts';
export async function api(
  event: RequestEvent,
  work: (userId: string) => Promise<unknown> | unknown,
) {
  try {
    if (!event.locals.user)
      throw new AppError(401, 'Sign in to Immich to continue');
    return json(await work(event.locals.user.id));
  } catch (error) {
    if (error instanceof AppError)
      return json({ message: error.message }, { status: error.status });
    if (error instanceof ZodError)
      return json(
        {
          message: error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; '),
        },
        { status: 400 },
      );
    if (error instanceof SyntaxError)
      return json({ message: 'Invalid JSON' }, { status: 400 });
    console.error('Pager request failed', {
      method: event.request.method,
      route: event.route.id,
    });
    return json(
      { message: 'The operation failed. Try again.' },
      { status: 500 },
    );
  }
}
export async function body(request: Request): Promise<unknown> {
  const text = await request.text();
  if (Buffer.byteLength(text) > 256 * 1024)
    throw new AppError(413, 'JSON body is too large');
  return JSON.parse(text);
}
