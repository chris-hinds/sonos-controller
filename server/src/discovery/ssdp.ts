import ssdp from 'node-ssdp';
const { Client } = ssdp;
import { XMLParser } from 'fast-xml-parser';
import type { SpeakerInfo } from '../../../shared/types.js';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const speakerMap = new Map<string, SpeakerInfo>();

async function fetchDeviceDescription(location: string): Promise<SpeakerInfo | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(location, { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const device = parsed?.root?.device;
    if (!device) return null;

    const url = new URL(location);
    const ip = url.hostname;

    return {
      ip,
      uuid: (device.UDN || '').replace('uuid:', ''),
      name: device.roomName || device.friendlyName || ip,
      model: device.modelName || 'Sonos',
      isCoordinator: false,
      groupId: '',
      coordinatorIp: '',
    };
  } catch (err) {
    console.error('[SSDP] Error fetching device description:', (err as Error).message);
    return null;
  }
}

async function runDiscovery(): Promise<void> {
  return new Promise((resolve) => {
    const client = new Client();
    const discovered = new Set<string>();

    const timeout = setTimeout(() => {
      client.stop();
      resolve();
    }, 5000);

    client.on('response', async (headers) => {
      const location = headers['LOCATION'] || headers['location'];
      if (!location || discovered.has(location)) return;
      discovered.add(location);

      const info = await fetchDeviceDescription(location);
      if (info) {
        speakerMap.set(info.ip, info);
        console.log(`[SSDP] Discovered: ${info.name} (${info.ip})`);
      }
    });

    client.search('urn:schemas-upnp-org:device:ZonePlayer:1');

    // Suppress unused variable warning — timeout is cleared inside the callback
    void timeout;
  });
}

async function startDiscovery(): Promise<void> {
  console.log('[SSDP] Starting discovery...');
  await runDiscovery();
  console.log(`[SSDP] Found ${speakerMap.size} speaker(s)`);

  setInterval(() => {
    console.log('[SSDP] Re-running discovery...');
    void runDiscovery();
  }, 60000);
}

function getSpeakers(): SpeakerInfo[] {
  return Array.from(speakerMap.values());
}

function updateSpeaker(ip: string, updates: Partial<SpeakerInfo>): void {
  const existing = speakerMap.get(ip);
  if (existing) {
    speakerMap.set(ip, { ...existing, ...updates });
  }
}

export { startDiscovery, getSpeakers, updateSpeaker, speakerMap };
