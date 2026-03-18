import { STANDARD_IMAGE_ALIASES } from './standardImageAliases.js';

export function resolveStandardImageId(id) {
  return STANDARD_IMAGE_ALIASES[id] ?? id;
}

export function getStandardImageSrc(id) {
  return `./assets/deck-images/${resolveStandardImageId(id)}`;
}
