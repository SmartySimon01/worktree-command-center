import type { PrivateApi } from './private-api';

/** No private overlay present — the wcc-private alias resolves here on public clones.
 *  NOTE: vitest/vite does not read tsconfig `paths`, so tests must not import
 *  'wcc-private' (add a vitest alias first if that's ever needed). */
export function registerPrivateFeatures(_api: PrivateApi): void {}
