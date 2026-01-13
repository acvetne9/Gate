// WHOIS and Reverse DNS Lookup Service
// Provides IP intelligence through WHOIS and DNS queries

import type { WhoisData } from './supabase'

/**
 * Perform reverse DNS lookup for an IP address
 * Returns the PTR record (hostname) for the IP
 */
export async function reverseDnsLookup(ip: string): Promise<string | null> {
  try {
    // Use a public DNS-over-HTTPS API for reverse DNS lookup
    const response = await fetch(
      `https://dns.google/resolve?name=${reverseIp(ip)}.in-addr.arpa&type=PTR`,
      { signal: AbortSignal.timeout(5000) } // 5 second timeout
    )

    if (!response.ok) return null

    const data = await response.json()

    if (data.Answer && data.Answer.length > 0) {
      // Return the first PTR record, remove trailing dot
      return data.Answer[0].data.replace(/\.$/, '')
    }

    return null
  } catch (error) {
    console.error('Reverse DNS lookup failed:', error)
    return null
  }
}

/**
 * Reverse IP address for PTR lookup (e.g., 8.8.8.8 -> 8.8.8.8)
 */
function reverseIp(ip: string): string {
  return ip.split('.').reverse().join('.')
}

/**
 * Perform WHOIS lookup for an IP address
 * Uses multiple free WHOIS APIs
 */
export async function whoisLookup(ip: string): Promise<WhoisData | null> {
  try {
    // Try ipapi.co first (free tier: 30k requests/month)
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      return fallbackWhoisLookup(ip)
    }

    const data = await response.json()

    return {
      orgName: data.org || data.asn_org || undefined,
      netRange: data.network || undefined,
      description: data.org || undefined,
      abuseEmail: undefined,
      registrationDate: undefined,
      country: data.country_name || data.country || undefined,
      city: data.city || undefined,
      region: data.region || undefined,
      latitude: data.latitude || undefined,
      longitude: data.longitude || undefined,
      isp: data.org || undefined,
      asn: data.asn || undefined
    }
  } catch (error) {
    console.error('WHOIS lookup failed:', error)
    return fallbackWhoisLookup(ip)
  }
}

/**
 * Fallback WHOIS lookup using ip-api.com
 */
async function fallbackWhoisLookup(ip: string): Promise<WhoisData | null> {
  try {
    // ip-api.com (free tier: 45 requests/minute) - request all location fields
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,isp,org,as,query`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!response.ok) return null

    const data = await response.json()

    if (data.status === 'fail') return null

    return {
      orgName: data.org || data.isp || undefined,
      netRange: data.as || undefined,
      description: data.isp || undefined,
      abuseEmail: undefined,
      registrationDate: undefined,
      country: data.country || undefined,
      city: data.city || undefined,
      region: data.regionName || data.region || undefined,
      latitude: data.lat || undefined,
      longitude: data.lon || undefined,
      isp: data.isp || undefined,
      asn: data.as || undefined
    }
  } catch (error) {
    console.error('Fallback WHOIS lookup failed:', error)
    return null
  }
}

/**
 * Determine network type based on WHOIS and reverse DNS data
 */
export function determineNetworkType(
  whoisData: WhoisData | null,
  reverseDns: string | null,
  orgName?: string
): string {
  const org = (whoisData?.orgName || orgName || '').toLowerCase()
  const dns = (reverseDns || '').toLowerCase()

  // Cloud providers
  if (
    org.includes('amazon') || dns.includes('amazonaws.com') ||
    org.includes('google') || dns.includes('googleusercontent') || dns.includes('googlebot') ||
    org.includes('microsoft') || org.includes('azure') ||
    dns.includes('cloudfront') ||
    org.includes('digital ocean') || org.includes('digitalocean') ||
    org.includes('linode') || org.includes('vultr') ||
    org.includes('ovh') || org.includes('hetzner')
  ) {
    return 'cloud'
  }

  // Datacenters / Hosting
  if (
    org.includes('data center') || org.includes('datacenter') ||
    org.includes('hosting') || org.includes('server') ||
    org.includes('colocated') || org.includes('colo') ||
    dns.includes('host')
  ) {
    return 'datacenter'
  }

  // Enterprise networks
  if (
    org.includes('corporation') || org.includes('corporate') ||
    org.includes('enterprises') || org.includes('inc.') ||
    org.includes('ltd.') || org.includes('limited')
  ) {
    return 'enterprise'
  }

  // ISPs / Residential
  if (
    org.includes('telecom') || org.includes('communications') ||
    org.includes('broadband') || org.includes('internet service') ||
    org.includes('cable') || org.includes('fiber')
  ) {
    return 'residential'
  }

  return 'unknown'
}

/**
 * Identify hosting provider from WHOIS data
 */
export function identifyHostingProvider(
  whoisData: WhoisData | null,
  reverseDns: string | null
): string | undefined {
  const org = (whoisData?.orgName || '').toLowerCase()
  const dns = (reverseDns || '').toLowerCase()

  const providers: { [key: string]: string } = {
    'amazon': 'Amazon Web Services (AWS)',
    'amazonaws': 'Amazon Web Services (AWS)',
    'google': 'Google Cloud Platform (GCP)',
    'googleusercontent': 'Google Cloud Platform (GCP)',
    'microsoft': 'Microsoft Azure',
    'azure': 'Microsoft Azure',
    'digitalocean': 'DigitalOcean',
    'digital ocean': 'DigitalOcean',
    'linode': 'Linode',
    'vultr': 'Vultr',
    'ovh': 'OVH',
    'hetzner': 'Hetzner',
    'cloudflare': 'Cloudflare',
    'fastly': 'Fastly',
    'akamai': 'Akamai',
    'rackspace': 'Rackspace',
    'godaddy': 'GoDaddy',
    'bluehost': 'Bluehost',
    'hostgator': 'HostGator',
    'dreamhost': 'DreamHost',
    'namecheap': 'Namecheap',
    'alibaba': 'Alibaba Cloud',
    'tencent': 'Tencent Cloud',
    'baidu': 'Baidu Cloud'
  }

  for (const [key, provider] of Object.entries(providers)) {
    if (org.includes(key) || dns.includes(key)) {
      return provider
    }
  }

  return undefined
}

/**
 * Comprehensive IP intelligence lookup
 * Combines WHOIS, reverse DNS, network type, and hosting provider detection
 */
export async function getIpIntelligence(ip: string, orgName?: string) {
  try {
    const [whoisData, reverseDns] = await Promise.all([
      whoisLookup(ip),
      reverseDnsLookup(ip)
    ])

    const networkType = determineNetworkType(whoisData, reverseDns, orgName)
    const hostingProvider = identifyHostingProvider(whoisData, reverseDns)

    return {
      whoisData,
      reverseDns,
      networkType,
      hostingProvider
    }
  } catch (error) {
    console.error('IP intelligence lookup failed:', error)
    return {
      whoisData: null,
      reverseDns: null,
      networkType: 'unknown',
      hostingProvider: undefined
    }
  }
}
