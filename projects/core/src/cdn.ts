/**
 * Applies the default Cloudflare zone settings for the project.
 * @file
 */

import { getZoneOutput, ZoneSettingsOverride } from '@pulumi/cloudflare';
import { Config } from '@pulumi/pulumi';

const config = new Config();

/**
 * Configures the Cloudflare zone with sane defaults. Almost all settings are
 * at their default value barring the SSL-mode which needs to be set to
 * "strict".
 */
new ZoneSettingsOverride('default-zone', {
  zoneId: getZoneOutput({
    name: config.require('defaultZone'),
  }).apply((zone) => zone.id),
  settings: {
    zeroRtt: 'on',
    //advanced_ddos: "on"
    alwaysOnline: 'off',
    alwaysUseHttps: 'on',
    automaticHttpsRewrites: 'on',
    brotli: 'on',
    browserCacheTtl: 14_400,
    browserCheck: 'on',
    cacheLevel: 'aggressive',
    challengeTtl: 1800,
    //ciphers
    cnameFlattening: 'flatten_at_root',
    developmentMode: 'off',
    earlyHints: 'on',
    //edge_cache_ttl: 7200
    emailObfuscation: 'on',
    h2Prioritization: 'on',
    hotlinkProtection: 'off',
    //http2: "on",
    http3: 'on',
    //imageResizing
    ipGeolocation: 'on',
    ipv6: 'on',
    maxUpload: 100,
    minTlsVersion: '1.0',
    //mirage: "off",
    nel: {
      enabled: true,
    },
    opportunisticEncryption: 'on',
    opportunisticOnion: 'on',
    //orange_to_orange
    // origin_error_page_pass_thru
    //polish
    //prefetch_preload"
    //proxy_read_timeout
    pseudoIpv4: 'off',
    replaceInsecureJs: 'on',
    //response_buffering
    rocketLoader: 'off',
    //automatic_platform_optimization
    //security_header
    securityLevel: 'medium',
    serverSideExclude: 'on',
    //sha1_support
    //sortQueryStringForCache: "off",
    ssl: 'strict',
    // ssl_recommender: custom
    //tls_1_2_only: "off",
    tls13: 'zrt',
    tlsClientAuth: 'off',
    //true_client_ip_header: off
    waf: 'off',
    //webp: "on",
    websockets: 'on',
  },
});
