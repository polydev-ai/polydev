/**
 * Force IPv4-only DNS resolution for Claude Code CLI
 * This preload script patches Node.js DNS to prevent IPv6 issues
 * in Firecracker VMs with IPv4-only NAT
 */

const dns = require('dns');

// 1. Force the default result order to IPv4 first (Node 17+)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
  console.log('[force-ipv4] Set default result order to ipv4first');
}

// 2. Monkey-patch dns.lookup to enforce family: 4
const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  } else if (!options) {
    options = {};
  } else if (typeof options === 'number') {
    options = { family: options };
  }

  // Force IPv4 regardless of what was requested
  options.family = 4;
  
  // Disable verbatim to prevent re-ordering back to IPv6 preference
  options.verbatim = false;
  
  // Log if we're overriding IPv6 request
  if (options.family !== 4) {
    console.log('[force-ipv4] Forcing IPv4 for:', hostname);
  }

  return originalLookup.call(dns, hostname, options, callback);
};

// 3. Also patch dns.promises.lookup if available
if (dns.promises && dns.promises.lookup) {
  const originalPromiseLookup = dns.promises.lookup;
  dns.promises.lookup = async function(hostname, options) {
    if (!options) {
      options = {};
    } else if (typeof options === 'number') {
      options = { family: options };
    }
    
    options.family = 4;
    options.verbatim = false;
    
    return originalPromiseLookup.call(dns.promises, hostname, options);
  };
}

console.log('[force-ipv4] DNS patched to force IPv4-only resolution');
