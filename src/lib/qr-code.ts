/** Only the published slug is accepted; callers cannot attach query credentials. */
export async function createPageQr(origin: string, publishedSlug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(publishedSlug))
    throw new Error('Publish a valid page URL first.');
  const base = new URL(origin);
  if (!['http:', 'https:'].includes(base.protocol))
    throw new Error('A public HTTP URL is required.');
  const url = `${base.origin}/page/${publishedSlug}`;
  const { default: QRCode } = await import('qrcode');
  const options = {
    errorCorrectionLevel: 'M' as const,
    margin: 4,
    width: 1024,
    color: { dark: '#000000ff', light: '#ffffffff' },
  };
  const [png, svg] = await Promise.all([
    QRCode.toDataURL(url, options),
    QRCode.toString(url, { ...options, type: 'svg' }),
  ]);
  return { url, png, svg, filename: `immichpager-${publishedSlug}-qr` };
}
