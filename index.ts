import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as path from "path";
import * as fs from "fs";
import * as zip from "zip-a-folder";
import * as docker from "@pulumi/docker";
import * as cloudflare from "@pulumi/cloudflare";


// 1. Create a GCP Storage Bucket to store the function source code
const functionBucket = new gcp.storage.Bucket("function-code-bucket", {
	location: "US",
});

// 2. Path to your TypeScript handler code (src/index.ts)
const functionSourceDir = path.join(__dirname, "src");

// 3. Create a zip file of the handler code
const zipFile = path.join(__dirname, "function.zip");

zip.zip(functionSourceDir, zipFile).then(() => {
	console.log(`Zipped function source code to: ${zipFile}`);
}).catch((error) => {
	console.error("Error zipping function source:", error);
});

const config = new pulumi.Config();
const region = config.get("gcp:region") || "us-central1"

// 4. Upload the zip file to the GCP Storage Bucket
const functionZipObject = new gcp.storage.BucketObject("function-code-object", {
	bucket: functionBucket.name,
	source: new pulumi.asset.FileAsset(zipFile),
});

// 5. Deploy the Cloud Function from the bucket and object
const cloudFunction = new gcp.cloudfunctions.Function("hello-world-function", {
	runtime: "nodejs20",        // Define runtime (Node.js 16)
	entryPoint: "helloWorld",   // The exported function name in src/index.ts
	sourceArchiveBucket: functionBucket.name,   // Bucket where zip is stored
	sourceArchiveObject: functionZipObject.name, // Object (zip) containing the function code
	triggerHttp: true,          // HTTP trigger for the function
	region: region
});

const functionInvokerBinding = new gcp.cloudfunctions.FunctionIamMember("helloWorldInvoker", {
	project: cloudFunction.project,
	region: cloudFunction.region,
	cloudFunction: cloudFunction.name,
	role: "roles/cloudfunctions.invoker",
	member: "allUsers",
});

const artifactRegistry = new gcp.artifactregistry.Repository("nodejs-repo", {
	location: region,
	format: "DOCKER",
	repositoryId: "nodejs-repo", // Choose a suitable name for your repo
});

const image = new docker.Image("my-node-app", {
	build: {
		platform: "linux/amd64",  // Specify the correct platform
		context: "./",               // Path to the directory containing your Dockerfile
		dockerfile: "./Dockerfile",  // Dockerfile path (if different from the default)
	},
	imageName: pulumi.interpolate`${artifactRegistry.location}-docker.pkg.dev/${artifactRegistry.project}/${artifactRegistry.name}/my-node-app:latest`,
	skipPush: false,  // Push the image to the registry
})

const serviceAccount = new gcp.serviceaccount.Account("cloud-run-sa", {
	accountId: "cloud-run-sa",
	displayName: "Cloud Run Service Account",
});

// Grant Logging permissions to the service account
const serviceAccountLoggingBinding = new gcp.projects.IAMBinding("logging-binding", {
	project: cloudFunction.project,
	role: "roles/logging.logWriter", // Grant permission to write logs
	members: [
		pulumi.interpolate`serviceAccount:${serviceAccount.email}`, // Correctly interpolate the Output<T>
	], // Add the service account itself as a member
});


const cloudRunService = new gcp.cloudrunv2.Service("my-node-app-service", {
	location: region,
	template: {
		serviceAccount: serviceAccount.email,
		timeout: '60s',
		scaling: { maxInstanceCount: 1, minInstanceCount: 0 },
		containers: [{
			image: image.imageName, // The built image URL from Artifact Registry
			envs: [{ name: "NODE_ENV", value: "production" }],
			resources: {
				startupCpuBoost: true,
				cpuIdle: true,  // This ensures CPU is allocated only when requests come in
				limits: {
					memory: "128Mi", // Memory limit
				},
			},
		}],
	},
	ingress: "INGRESS_TRAFFIC_ALL", // Allow public access
});

const uptimeCheckConfig = cloudRunService.uri.apply(uri => {
	new gcp.monitoring.UptimeCheckConfig("health-check", {
		displayName: "Health Check for Cloud Run Service",
		monitoredResource: {
			type: "uptime_url",  // Type of the monitored resource
			labels: {
				host: new URL(uri).hostname
			},
		},
		httpCheck: {
			path: "/health",  // Endpoint to check
			port: 443,  // Default HTTP port (Cloud Run uses 80)
			requestMethod: "GET", // HTTP method
			useSsl: true, // If the service uses HTTPS
			validateSsl: false
		},
		period: "900s", // How often to run the check
		timeout: "5s",  // Timeout for the check
	})
})

const publicAccess = new gcp.cloudrunv2.ServiceIamMember("public-access", {
	name: cloudRunService.name,  // Reference to the service
	location: cloudRunService.location,
	role: "roles/run.invoker",  // Role for invoker (public access)
	member: "allUsers",  // This grants access to everyone
});

const domainMapping = new gcp.cloudrun.DomainMapping("my-domain-mapping", {
	location: region,
	name: "gcp.mrida.ng",
	metadata: {
		namespace: cloudFunction.project,
	},
	spec: {
		routeName: cloudRunService.name,  // The name of the Cloud Run service
	},
});

const zoneName = "mrida.ng";

const zone = cloudflare.getZone({ name: zoneName }).then(zone => zone.id);


// Add a CNAME record for a subdomain like "app.mrida.nfg"
cloudRunService.uri.apply(uri => {
	new cloudflare.Record("cloud-run-cname", {
		zoneId: zone,
		name: "gcp",
		type: "CNAME",
		content: 'ghs.googlehosted.com.',
		proxied: true, // Enable Cloudflare proxy
	});
})

// Export the function URL for testing
export const url = cloudRunService.uri
export const functionUrl = cloudFunction.httpsTriggerUrl;
