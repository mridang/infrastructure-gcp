import * as gcp from "@pulumi/gcp";
import {defaultRegion} from "./region";

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
	ipCidrRange: "10.0.0.0/24",
	region: defaultRegion,
	network: vpc.id,
	ipv6AccessType: "INTERNAL", // Internal IPv6 traffic only
	stackType: "IPV4_IPV6", // Enables both IPv4 and IPv6
});

/**
 * Firewall rule to allow internal ipv6 traffic between services and nodes inside
 * the VPC.
 */
new gcp.compute.Firewall("allow-internal-ipv6", {
	network: vpc.id,
	allows: [
		{
			protocol: "tcp",
			ports: ["0-65535"],
		},
		{
			protocol: "udp",
			ports: ["0-65535"],
		},
		{
			protocol: "58", // An alias for ICMPv6 as since GCP doesn't understand
		},
	],
	sourceRanges: ["fd00::/8"],
});

/**
 * Create a Cloud Router (required for Cloud NAT).
 */
const cloudRouter = new gcp.compute.Router("default-router", {
	region: defaultRegion,
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
	region: defaultRegion,
	natIpAllocateOption: "AUTO_ONLY",
	sourceSubnetworkIpRangesToNat: "ALL_SUBNETWORKS_ALL_IP_RANGES"
});

export const defaultSubnet = subnet
export const defaultVPC = vpc
