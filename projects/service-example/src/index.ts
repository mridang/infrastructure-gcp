/**
 * Deploys the example Express service to Cloud Run behind Cloudflare.
 * @file
 */

import {
  artifactregistry,
  cloudrun,
  cloudrunv2,
  config as gcpConfig,
  monitoring,
  projects,
  serviceaccount,
} from '@pulumi/gcp';
import { Image } from '@pulumi/docker';
import { Config, interpolate, StackReference } from '@pulumi/pulumi';
import {
  getZoneOutput,
  PageRule,
  Record as CloudflareRecord,
} from '@pulumi/cloudflare';
import path from 'node:path';

const coreStack = new StackReference('mridang/core-infra/dev');
const config = new Config();

/**
 * We create one registry per project where the containers will be pushed to.
 */
const artifactRegistry = new artifactregistry.Repository('nodejs-repo', {
  location: coreStack.getOutput('defaultRegion'),
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
const image = new Image('my-node-app', {
  build: {
    platform: 'linux/amd64',
    // eslint-disable-next-line unicorn/prefer-module -- the root tsconfig compiles to CommonJS, where import.meta is unavailable
    context: __dirname,
    // eslint-disable-next-line unicorn/prefer-module -- the root tsconfig compiles to CommonJS, where import.meta is unavailable
    dockerfile: path.resolve(__dirname, 'Dockerfile'),
  },
  imageName: interpolate`${artifactRegistry.location}-docker.pkg.dev/${artifactRegistry.project}/${artifactRegistry.name}/my-node-app:latest`,
  skipPush: false,
});

/**
 * A service account is created for each project to ensure that we don't rely on
 * any of the default service accounts.
 */
const serviceAccount = new serviceaccount.Account('cloud-run-sa', {
  accountId: 'cloud-run-sa',
  displayName: 'Cloud Run Service Account',
});

/**
 * A separate service account is created for each project which allows for
 * granular control over the permissions.
 */
new projects.IAMBinding('logging-binding', {
  project: gcpConfig.project || '',
  role: 'roles/logging.logWriter', // Grant permission to write logs
  members: [interpolate`serviceAccount:${serviceAccount.email}`], // Add the service account itself as a member
});

const cloudRunService = new cloudrunv2.Service('my-node-app-service', {
  location: coreStack.getOutput('defaultRegion'),
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

new monitoring.UptimeCheckConfig('health-check', {
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
new cloudrunv2.ServiceIamMember('public-access', {
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
new cloudrun.DomainMapping('my-domain-mapping', {
  location: coreStack.getOutput('defaultRegion'),
  name: 'gcp.mrida.ng',
  metadata: {
    namespace: gcpConfig.project || '',
  },
  spec: {
    routeName: cloudRunService.name,
  },
});

/**
 * Add a page-rule exclusion to ensure that the ACME challenge goes through. The
 * challenge works by providing a file that you need to make
 * available at /.well-known/acme-challenge/<filename> on the domain.
 *
 * LetsEncrypt will then try to download the file. If they find it, that serves
 * as proof that you control that particular (sub)domain, and they will issue
 * you a certificate for it.
 *
 * Cloudflare interferes in that process in many different ways, and you have
 * to basically disable all Cloudflare features for that path.
 */
new PageRule('acme-challenge-bypass', {
  zoneId: getZoneOutput({
    name: config.require('defaultZone'),
  }).apply((zone) => zone.id),
  target: `gcp.mrida.ng/.well-known/acme-challenge/*`,
  priority: 1,
  actions: {
    ssl: 'off',
    automaticHttpsRewrites: 'off',
    browserCheck: 'off',
    cacheLevel: 'bypass',
    securityLevel: 'essentially_off',
  },
});

/**
 * To ensure that Cloudflare forwards all the traffic over to this service, we
 * create a CNAME record that points to the service.
 */
new CloudflareRecord('cloud-run-cname', {
  zoneId: getZoneOutput({
    name: config.require('defaultZone'),
  }).apply((zone) => zone.id),
  name: 'gcp',
  type: 'CNAME',
  content: 'ghs.googlehosted.com.',
  proxied: true,
});

export const serviceUri = cloudRunService.uri;
