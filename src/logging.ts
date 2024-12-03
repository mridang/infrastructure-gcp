import * as gcp from '@pulumi/gcp';

/**
 * Logging buckets are automatically created for a given folder, project,
 * organization, billingAccount and cannot be deleted. Creating a resource of
 * this type will acquire and update the resource that already exists at the
 * desired location. These buckets cannot be removed so deleting this resource
 * will remove the bucket config from your state but will leave the logging
 * bucket unchanged.
 * The buckets that are currently automatically created are “_Default” and
 * “_Required”.
 *
 * By default, the logging retention is 30 days and log analytics are disabled
 */
new gcp.logging.ProjectBucketConfig('basic', {
  project: gcp.config.project || '',
  location: 'global',
  retentionDays: 14,
  enableAnalytics: true,
  bucketId: '_Default',
  description: 'Default bucket for storing all the project-wide logs',
});
