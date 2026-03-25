export async function loadStandardImageNames(fetchFn = globalThis.fetch) {
  const response = await fetchFn('./assets/deck-images/manifest.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load standard image manifest.');
  }

  return response.json();
}
