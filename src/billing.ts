import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config('custom');

new gcp.monitoring.NotificationChannel('budget-alert-channel', {
  displayName: 'Budget Alert Channel',
  type: 'email',
  labels: {
    email_address: config.require('billingNotify'),
  },
});

// /**
//  * Create a GCP budget with a €10 threshold
//  */
// const budget = new gcp.billing.Budget("billing-budget", {
// 	billingAccount: '018070-4A9703-1A66C4',
// 	amount: {
// 		specifiedAmount: {
// 			currencyCode: "EUR",
// 			units: "10", // 10 euros
// 		},
// 	},
// 	thresholdRules: [
// 		{
// 			thresholdPercent: 1.0, // 100% of the budget
// 		},
// 	],
// 	allUpdatesRule: {
// 		monitoringNotificationChannels: [notificationChannel.id],
// 		disableDefaultIamRecipients: true,
// 	}
// })
