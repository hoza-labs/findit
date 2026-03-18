// Removes the generated docs/ output so it can be recreated from a clean slate.
import { rm } from 'node:fs/promises';

await rm(new URL('../docs', import.meta.url), { recursive: true, force: true });
