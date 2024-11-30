import * as gcp from "@pulumi/gcp";
import * as random from "@pulumi/random";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

import {defaultSubnet} from "./vpc";

const config = new pulumi.Config('cf');

/**
 * Cloudflare requires a secret and this should be specified when creating the
 * tunnel. Rather than have any user intervention to specify the secret, we
 * simply generate it.
 */
const tunnelSecret = new random.RandomPassword("tunnel-secret", {
	length: 32,
	special: false, // Cloudflare doesn't require special characters
});

/**
 * The protect flag will ensure that the secret doesn't change
 * on every deploy.
 */
const cloudflareTunnel = new cloudflare.ZeroTrustTunnelCloudflared("gcp", {
	accountId: config.require("accountId"),
	name: "gcp",
	secret: tunnelSecret.result,
}, {
	protect: true // Prevent regeneration of secret on every update
});

const tunnelConfig = new cloudflare.ZeroTrustTunnelCloudflaredConfig("gcp-config", {
	accountId: config.require("accountId"),
	tunnelId: cloudflareTunnel.id,
	config: {
		ingressRules: [
			{
				hostname: "myapp.example.com",
				service: "http://localhost:8080",
			},
			{
				service: "http_status:404", // Catch-all rule
			},
		],
		originRequest: {
			connectTimeout: "30s",
			tlsTimeout: "30s",
			tcpKeepAlive: "30s",
			noTlsVerify: true,
		},
	},
});

const secret = new gcp.secretmanager.Secret("cloudflare-tunnel-secret", {
	secretId: "cloudflare-tunnel-secret-id",
	replication: {
		auto: {},
	},
	labels: {
		"environment": "production",
	},
});

// Create the first version of the secret with the generated random password
const cfToken = new gcp.secretmanager.SecretVersion("cloudflare-tunnel-secret-version", {
	secret: secret.id,
	secretData: cloudflareTunnel.tunnelToken,
}, {
	protect: true, // Ensure this version is not recreated unless explicitly needed
});

/**
 * A single instance is used to ensure that the
 */
const vm = new gcp.compute.Instance("etc-cloudflare", {
	machineType: "f1-micro", // Free-tier eligible instance type
	zone: "us-central1-a", // Choose a zone in the same region as the subnet
	bootDisk: {
		initializeParams: {
			image: "debian-cloud/debian-11", // Lightweight OS image
		},
	},
	metadataStartupScript: cfToken.secretData.apply((token) => `
#!/bin/bash
# Install cloudflared using the .deb package
wget -nv -P /tmp/ https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i /tmp/cloudflared-linux-amd64.deb
rm /tmp/cloudflared-linux-amd64.deb

echo "Using Cloudflare Tunnel token: ${token}"
# Run the tunnel with the token directly
cloudflared tunnel --no-autoupdate run --token ${token}
`),
	networkInterfaces: [
		{
			subnetwork: defaultSubnet.id,
			accessConfigs: [], // No external IP, uses Cloud NAT for outbound connectivity
		},
	],
});

export const argoTunnel = vm
