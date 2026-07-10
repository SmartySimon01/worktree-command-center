import type { PrivateApi } from './private-api';

/** No private overlay present — the wcc-private alias resolves here on public clones. */
export function registerPrivateFeatures(_api: PrivateApi): void {}
