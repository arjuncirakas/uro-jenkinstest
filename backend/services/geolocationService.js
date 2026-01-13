/**
 * Geolocation Service
 * Converts IP addresses to location names using ip-api.com
 */

/**
 * Get location information from IP address
 * @param {string} ipAddress - IP address to lookup
 * @returns {Promise<Object|null>} Location object with city, region, country, or null if lookup fails
 */
export const getLocationFromIP = async (ipAddress) => {
  // Check for localhost/private IPs
  if (!ipAddress || ipAddress === 'unknown') {
    return null;
  }
  
  // IPv6 loopback
  if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
    return {
      location: 'Localhost (Local Connection)',
      city: null,
      region: null,
      country: null,
      ip: ipAddress
    };
  }
  
  // IPv4 loopback and private ranges
  if (ipAddress.startsWith('127.') || 
      ipAddress.startsWith('192.168.') || 
      ipAddress.startsWith('10.') ||
      ipAddress.startsWith('172.16.') ||
      ipAddress.startsWith('172.17.') ||
      ipAddress.startsWith('172.18.') ||
      ipAddress.startsWith('172.19.') ||
      ipAddress.startsWith('172.20.') ||
      ipAddress.startsWith('172.21.') ||
      ipAddress.startsWith('172.22.') ||
      ipAddress.startsWith('172.23.') ||
      ipAddress.startsWith('172.24.') ||
      ipAddress.startsWith('172.25.') ||
      ipAddress.startsWith('172.26.') ||
      ipAddress.startsWith('172.27.') ||
      ipAddress.startsWith('172.28.') ||
      ipAddress.startsWith('172.29.') ||
      ipAddress.startsWith('172.30.') ||
      ipAddress.startsWith('172.31.') ||
      ipAddress === '0.0.0.0') {
    return {
      location: 'Private Network (Local Connection)',
      city: null,
      region: null,
      country: null,
      ip: ipAddress
    };
  }

  try {
    // Use ip-api.com free service (no API key required, rate limit: 45 requests/minute)
    // Use HTTPS for better security and compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
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
        // Timeout - don't log as error
        return null;
      }
      throw fetchError;
    }
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
