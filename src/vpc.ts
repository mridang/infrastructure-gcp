import * as gcp from "@pulumi/gcp";

const vpc = new gcp.compute.Network("my-vpc", {
	autoCreateSubnetworks: false, // Disable default subnets
});

const subnet = new gcp.compute.Subnetwork("my-subnet", {
	ipCidrRange: "10.0.0.0/24", // CIDR range
	region: "us-central1", // Choose your region
	network: vpc.id,
});

// Create a Cloud Router (required for Cloud NAT)
const cloudRouter = new gcp.compute.Router("my-cloud-router", {
	region: "us-central1",
	network: vpc.id,
});

// Create a Cloud NAT to provide outbound connectivity for VMs without external IPs
const cloudNat = new gcp.compute.RouterNat("my-cloud-nat", {
	router: cloudRouter.name,
	region: "us-central1",
	natIpAllocateOption: "AUTO_ONLY", // Automatically allocate IPs for NAT
	sourceSubnetworkIpRangesToNat: "ALL_SUBNETWORKS_ALL_IP_RANGES", // NAT for all subnets
});

export const defaultSubnet = subnet
export const defaultVPC = vpc
