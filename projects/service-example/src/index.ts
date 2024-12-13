import * as gcp from '@pulumi/gcp';
import * as docker from '@pulumi/docker';
import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';
import * as path from 'node:path';

const coreStack = new pulumi.StackReference("mridang/core-infra/dev");
const config = new pulumi.Config();

/**
 * We create one registry per project where the containers will be pushed to.
 */
const artifactRegistry = new gcp.artifactregistry.Repository('nodejs-repo', {
  location: coreStack.getOutput("defaultRegion"),
  format: 'DOCKER',
  repositoryId: 'nodejs-repo',
  dockerConfig: {
    immutableTags: false, // So we can push the latest version after a build
  },
});

/**
 * The image is built using the local Dockerfile and pushed to the remote
 * repository.
 */
const image = new docker.Image('my-node-app', {
  build: {
    platform: 'linux/amd64',
    context: __dirname,
    dockerfile: path.resolve(__dirname, 'Dockerfile'),
  },
  imageName: pulumi.interpolate`${artifactRegistry.location}-docker.pkg.dev/${artifactRegistry.project}/${artifactRegistry.name}/my-node-app:latest`,
  skipPush: false,
});

/**
 * A service account is created for each project to ensure that we don't rely on
 * any of the default service accounts.
 */
const serviceAccount = new gcp.serviceaccount.Account('cloud-run-sa', {
  accountId: 'cloud-run-sa',
  displayName: 'Cloud Run Service Account',
});

/**
 * A separate service account is created for each project which allows for
 * granular control over the permissions
 */
new gcp.projects.IAMBinding('logging-binding', {
  project: gcp.config.project || '',
  role: 'roles/logging.logWriter', // Grant permission to write logs
  members: [pulumi.interpolate`serviceAccount:${serviceAccount.email}`], // Add the service account itself as a member
});

const cloudRunService = new gcp.cloudrunv2.Service('my-node-app-service', {
  location: coreStack.getOutput("defaultRegion"),
  template: {
    serviceAccount: serviceAccount.email,
    timeout: '60s',
    scaling: {
      maxInstanceCount: 1,
      minInstanceCount: 0,
    },
    containers: [
      {
        image: image.imageName,
        envs: [
          {
            name: 'NODE_ENV',
            value: 'production',
          },
          {
            name: 'SERVICE_VERSION',
            value: `${Date.now()}`,
          },
        ],
        resources: {
          startupCpuBoost: true,
          cpuIdle: true, // Only allocate when requests come in
          limits: {
            memory: '128Mi', // Memory limit
          },
        },
      },
    ],
  },
  ingress: 'INGRESS_TRAFFIC_ALL', // Allow public access
	deletionProtection: false,
});

new gcp.monitoring.UptimeCheckConfig('health-check', {
  displayName: 'Health Check for Cloud Run Service',
  monitoredResource: {
    type: 'uptime_url',
    labels: {
      host: cloudRunService.uri.apply((uri) => new URL(uri).hostname),
    },
  },
  httpCheck: {
    path: '/health',
    port: 443,
    requestMethod: 'GET',
    useSsl: true,
    validateSsl: false,
  },
  period: '900s',
  timeout: '5s',
});

/**
 * The service is supposed to be publicly accessible, and therefore we grant the
 * invoke permission to all users.
 * Without this, the service would get deployed but no one would be able to
 * access it.
 */
new gcp.cloudrunv2.ServiceIamMember('public-access', {
  name: cloudRunService.name,
  location: cloudRunService.location,
  role: 'roles/run.invoker', // Role for invoker (public access)
  member: 'allUsers', // This grants access to everyone
});

/**
 * By default, the services all have a .app domain, but we always want to front
 * these services via a CDN, therefore it is necessary to add a domain mapping
 * to the service.
 */
new gcp.cloudrun.DomainMapping('my-domain-mapping', {
  location: coreStack.getOutput("defaultRegion"),
  name: 'gcp.mrida.ng',
  metadata: {
    namespace: gcp.config.project || '',
  },
  spec: {
    routeName: cloudRunService.name,
  },
});

/**
 * Add a page-rule exclusion to ensure that the ACME challenge goes through. The
 * challenge works by providing a file that you need to make
 * available under http://example.com/.well-known/acme-challenge/<filename>.
 *
 * LetsEncrypt will then try to download the file. If they find it, that serves
 * as proof that you control that particular (sub)domain, and they will issue
 * you a certificate for it.
 *
 * Cloudflare interferes in that process in many different ways, and you have
 * to basically disable all Cloudflare features for that path.
 */
new cloudflare.PageRule("acme-challenge-bypass", {
	zoneId: cloudflare
		.getZone({
			name: config.require('defaultZone'),
		})
		.then((zone) => zone.id),
	target: `gcp.mrida.ng/.well-known/acme-challenge/*`,
	priority: 1,
	actions: {
		ssl: "off",
		automaticHttpsRewrites: "off",
		browserCheck: "off",
		cacheLevel: "bypass",
		securityLevel: "essentially_off",
	},
});

/**
 * To ensure that Cloudflare forwards all the traffic over to this service, we
 * create a CNAME record that points to the service.
 */
new cloudflare.Record('cloud-run-cname', {
  zoneId: cloudflare
    .getZone({
      name: config.require('defaultZone'),
    })
    .then((zone) => zone.id),
  name: 'gcp',
  type: 'CNAME',
  content: 'ghs.googlehosted.com.',
  proxied: true,
});

export const serviceUri = cloudRunService.uri;
