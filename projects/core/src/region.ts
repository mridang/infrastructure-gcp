/**
 * Resolves the default GCP region used by the core infrastructure.
 * @file
 */

import { config } from '@pulumi/gcp';

export const defaultRegion = config.region || 'us-central1';
