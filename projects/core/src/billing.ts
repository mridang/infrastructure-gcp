/**
 * Configures the billing alert channel for the core GCP project.
 * @file
 */

import { monitoring } from '@pulumi/gcp';
import { Config } from '@pulumi/pulumi';

const config = new Config('custom');

// eslint-disable-next-line no-new -- a Pulumi resource registers itself on construction
new monitoring.NotificationChannel('budget-alert-channel', {
  displayName: 'Budget Alert Channel',
  type: 'email',
  labels: {
    email_address: config.require('billingNotify'),
  },
});
