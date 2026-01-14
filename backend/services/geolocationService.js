/**
 * Geolocation Service
 * Converts IP addresses to location names using ip-api.com
 */

// Helper function to check if IP is private/local
const isPrivateIP = (ipAddress) => {
  if (!ipAddress) return false;
  if (ipAddress === '0.0.0.0') return true;
  if (ipAddress.startsWith('127.')) return true;
  if (ipAddress.startsWith('192.168.')) return true;
  if (ipAddress.startsWith('10.')) return true;
  // Check 172.16.0.0 - 172.31.255.255 range
  if (ipAddress.startsWith('172.')) {
    const parts = ipAddress.split('.');
    if (parts.length >= 2) {
      const secondOctet = parseInt(parts[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Get location information from IP address
 * @param {string} ipAddress - IP address to lookup
 * @returns {Promise<Object|null>} Location object with city, region, country, or null if lookup fails
 */
// Helper function to create localhost location object
const createLocalhostLocation = (ipAddress) => ({
  location: 'Localhost (Local Connection)',
  city: null,
  region: null,
  country: null,
  ip: ipAddress
});

// Helper function to create private network location object
const createPrivateNetworkLocation = (ipAddress) => ({
  location: 'Private Network (Local Connection)',
  city: null,
  region: null,
  country: null,
  ip: ipAddress
});

// Helper function to check if IP is localhost
const isLocalhost = (ipAddress) => {
  return ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1';
};

// Helper function to fetch location from API
const fetchLocationFromAPI = async (ipAddress) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(`https://ip-api.com/json/${ipAddress}?fields=status,message,country,regionName,city,query`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`IP lookup failed for ${ipAddress}: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.status === 'success' && data.country) {
      const locationParts = [];
      if (data.city) locationParts.push(data.city);
      if (data.regionName) locationParts.push(data.regionName);
      if (data.country) locationParts.push(data.country);

      return {
        location: locationParts.length > 0 ? locationParts.join(', ') : data.country || null,
        city: data.city || null,
        region: data.regionName || null,
        country: data.country || null,
        ip: data.query || ipAddress
      };
    }

    return null;
  } catch (fetchError) {
    clearTimeout(timeoutId);
    if (fetchError.name === 'AbortError') {
      return null;
    }
    throw fetchError;
  }
};

export const getLocationFromIP = async (ipAddress) => {
  // Check for localhost/private IPs
  if (!ipAddress || ipAddress === 'unknown') {
    return null;
  }
  
  // IPv6 loopback
  if (isLocalhost(ipAddress)) {
    return createLocalhostLocation(ipAddress);
  }
  
  // IPv4 loopback and private ranges
  if (isPrivateIP(ipAddress)) {
    return createPrivateNetworkLocation(ipAddress);
  }

  try {
    return await fetchLocationFromAPI(ipAddress);
  } catch (error) {
    // Don't log timeout errors as they're expected for rate limiting
    if (error.name !== 'AbortError' && error.name !== 'TimeoutError') {
      console.error(`Error looking up location for IP ${ipAddress}:`, error.message);
    }
    return null;
  }
};

/**
 * Batch lookup locations for multiple IP addresses
 * @param {string[]} ipAddresses - Array of IP addresses
 * @returns {Promise<Map<string, Object>>} Map of IP address to location object
 */
export const batchGetLocationsFromIPs = async (ipAddresses) => {
  const locationMap = new Map();
  
  // Process in batches to respect rate limits (45 requests/minute)
  const batchSize = 10;
  const delay = 2000; // 2 seconds between batches to stay under rate limit

  for (let i = 0; i < ipAddresses.length; i += batchSize) {
    const batch = ipAddresses.slice(i, i + batchSize);
    
    const promises = batch.map(async (ip) => {
      const location = await getLocationFromIP(ip);
      if (location) {
        locationMap.set(ip, location);
      }
      return location;
    });

    await Promise.all(promises);

    // Add delay between batches (except for the last batch)
    if (i + batchSize < ipAddresses.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return locationMap;
};
