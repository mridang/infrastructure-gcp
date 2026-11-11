/**
 * Resolves the default GCP region used by the core infrastructure.
 * @file
 */

import { config as gcpConfig } from '@pulumi/gcp';

export const defaultRegion = gcpConfig.region || 'us-central1';
