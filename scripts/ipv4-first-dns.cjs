'use strict';
/**
 * Preload for npm CLI: prefer IPv4 when resolving registry hostnames.
 * Helps Windows environments where IPv6 to Cloudflare/npm fails with EACCES.
 */
const dns = require('node:dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
