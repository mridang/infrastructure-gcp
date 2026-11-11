/**
 * Entry point that loads each core module and re-exports the shared resources.
 * @file
 */

import './vpc';
import './cdn';
import './services/cloudflare';
import './billing';
import './logging';

export { defaultRegion } from './region';
export { defaultVPC } from './vpc';
