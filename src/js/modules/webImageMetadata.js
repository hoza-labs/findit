export function trimWebImageName(name) {
  return (name ?? '').trim();
}

export function normalizeWebContentType(rawContentType) {
  if (!rawContentType) {
    return 'unknown';
  }

  const mediaType = String(rawContentType).split(';')[0].trim().toLowerCase();
  if (!mediaType) {
    return 'unknown';
  }

  if (mediaType.startsWith('image/')) {
    const subtype = mediaType.slice('image/'.length).trim();
    return subtype || 'unknown';
  }

  const slashIndex = mediaType.indexOf('/');
  if (slashIndex >= 0 && slashIndex < mediaType.length - 1) {
    return mediaType.slice(slashIndex + 1);
  }

  return mediaType;
}

export function getDefaultWebImageName(url) {
  const rootDomain = getRootDomain(url);
  const shortHash = getShortUrlHash(url);
  return `${rootDomain}-${shortHash}`;
}

export function getWebImageCaption(webImage) {
  const name = trimWebImageName(webImage?.name) || getDefaultWebImageName(webImage?.url ?? '');
  const contentType = normalizeWebContentType(webImage?.contentType);
  return `${name}/${contentType}`;
}

function getRootDomain(url) {
  try {
    const { hostname } = new URL(url);
    if (hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      return hostname;
    }

    const labels = hostname.split('.').filter(Boolean);
    if (labels.length < 2) {
      return hostname;
    }
    return `${labels[labels.length - 2]}.${labels[labels.length - 1]}`;
  } catch {
    return 'invalid';
  }
}

function getShortUrlHash(url) {
  // FNV-1a 32-bit hash, rendered as fixed 5-char base36.
  let hash = 2166136261;
  const text = String(url ?? '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  const unsigned = hash >>> 0;
  return unsigned.toString(36).padStart(5, '0').slice(-5);
}
