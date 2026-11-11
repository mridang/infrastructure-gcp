/**
 * Configures the billing alert channel for the core GCP project.
 * @file
 */

import { monitoring } from '@pulumi/gcp';
import { Config } from '@pulumi/pulumi';

const config = new Config('custom');

new monitoring.NotificationChannel('budget-alert-channel', {
  displayName: 'Budget Alert Channel',
  type: 'email',
  labels: {
    email_address: config.require('billingNotify'),
  },
});
