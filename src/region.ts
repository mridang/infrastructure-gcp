import * as gcp from '@pulumi/gcp';

export const defaultRegion = gcp.config.region || 'us-central1';
