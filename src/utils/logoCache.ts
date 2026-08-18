/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Downloads a remote quiz logo and converts it to a base64 data URL so it survives
 * being saved in IndexedDB and works offline, independent of the original host.
 * Data URLs and empty values are returned unchanged.
 */
export async function cacheLogoAsDataUrl(url: string | undefined): Promise<string | undefined> {
  if (!url) return url;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:')) return trimmed || undefined;

  try {
    const res = await fetch(trimmed, { mode: 'cors' });
    if (!res.ok) return trimmed;
    const blob = await res.blob();
    // Avoid bloating IndexedDB/localStorage with oversized images
    if (blob.size > 3 * 1024 * 1024) return trimmed;

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Could not cache quiz logo locally, keeping remote URL:', err);
    return trimmed;
  }
}
