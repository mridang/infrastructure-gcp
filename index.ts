import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as path from "path";
import * as zip from "zip-a-folder";
import {defaultVPC} from './src/vpc';
import {argoTunnel} from './src/instances'
import './src/billing'
import {serviceUri} from './src/services/mycontainer'

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


// Export the function URL for testing
export const url = serviceUri
export const functionUrl = cloudFunction.httpsTriggerUrl;
export const  vpcid = defaultVPC
export const argoTunne = argoTunnel
