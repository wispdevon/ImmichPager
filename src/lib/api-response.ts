/** Decode management responses without exposing proxy HTML or JSON parser errors. */
export async function readApiResponse<T>(response: Response): Promise<T> {
  const status = `HTTP ${response.status}`;
  const fallback =
    response.status === 413
      ? 'Request is too large. Branding images must be 5 MB or smaller.'
      : response.status === 401
        ? 'Your Immich session has expired. Sign in to Immich in another tab, then try again.'
        : response.status === 403
          ? `Access was denied (${status}). Refresh your Immich session and try again.`
          : response.ok
            ? `The server returned an unreadable response (${status}). Your edits are still here. Check Client pages in another tab before retrying.`
            : `The server could not complete this request (${status}). Your edits are still here; try again shortly.`;
  let result: unknown;
  try {
    result = JSON.parse(await response.text());
  } catch {
    throw new Error(fallback);
  }
  if (!response.ok) {
    const message =
      result && typeof result === 'object' && 'message' in result
        ? result.message
        : undefined;
    throw new Error(
      typeof message === 'string' && message ? message : fallback,
    );
  }
  if (!result || typeof result !== 'object') throw new Error(fallback);
  return result as T;
}
