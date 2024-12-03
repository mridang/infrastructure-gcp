import * as gcp from "@pulumi/gcp";

/**
 * Create a single default VPC for the projects which spans a single region.
 */
const vpc = new gcp.compute.Network("default-vpc", {
	autoCreateSubnetworks: false, // Disable default subnets
	enableUlaInternalIpv6: true, // Enable unique local address (ULA) IPv6
});

/**
 * Create a single default subnet inside the VPC. The purpose of this subnet is
 * to be a "regular subnet". https://cloud.google.com/vpc/docs/subnets#purpose
 */
const subnet = new gcp.compute.Subnetwork("default-subnet", {
	ipCidrRange: "10.0.0.0/24", // CIDR range
	region: "us-central1", // Choose your region
	network: vpc.id,
	ipv6AccessType: "INTERNAL", // Internal IPv6 traffic only
	stackType: "IPV4_IPV6", // Enables both IPv4 and IPv6
});

/**
 * Create a Cloud Router (required for Cloud NAT).
 */
const cloudRouter = new gcp.compute.Router("default-router", {
	region: "us-central1",
	network: vpc.id,
});

/**
 * Create a Cloud NAT to provide outbound connectivity for VMs without external IPs.
 * This approach is chosen to ensure that resources inside the VPC don't need to be
 * assigned external IP addresses which both costs and increases the surface area
 * of an attack.
 */
new gcp.compute.RouterNat("default-nat", {
	router: cloudRouter.name,
	region: "us-central1",
	natIpAllocateOption: "AUTO_ONLY",
	sourceSubnetworkIpRangesToNat: "ALL_SUBNETWORKS_ALL_IP_RANGES"
});

export const defaultSubnet = subnet
export const defaultVPC = vpc
