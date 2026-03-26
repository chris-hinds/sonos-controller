import { soapCall } from './soap.js';
import { XMLParser } from 'fast-xml-parser';
import { getSpeakers, updateSpeaker, speakerMap } from '../discovery/ssdp.js';
import type { SpeakerInfo } from '@sonos/shared';

const SERVICE_PATH = '/ZoneGroupTopology/Control';
const SERVICE_TYPE = 'urn:schemas-upnp-org:service:ZoneGroupTopology:1';

const topoParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

let topologyTimer: ReturnType<typeof setInterval> | null = null;

function decodeXmlEntities(str: string): string {
  if (!str) return str;
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function fetchTopology(): Promise<void> {
  const speakers = getSpeakers();
  if (speakers.length === 0) return;

  for (const speaker of speakers) {
    try {
      const res = await soapCall(speaker.ip, SERVICE_PATH, SERVICE_TYPE, 'GetZoneGroupState', {});
      const body = res?.['s:Envelope']?.['s:Body'] || res?.Envelope?.Body || {};
      const resp = body['u:GetZoneGroupStateResponse'] || body['GetZoneGroupStateResponse'] || {};

      const stateXml = decodeXmlEntities(resp.ZoneGroupState || '');
      if (!stateXml) continue;

      const parsed = topoParser.parse(stateXml);
      const groups = parsed?.ZoneGroups?.ZoneGroup;
      if (!groups) continue;

      const groupArray: unknown[] = Array.isArray(groups) ? groups : [groups];

      const uuidToIp = new Map<string, string>();
      for (const sp of speakers) {
        uuidToIp.set(sp.uuid, sp.ip);
        uuidToIp.set(`RINCON_${sp.uuid}`, sp.ip);
      }

      for (const group of groupArray) {
        const g = group as Record<string, unknown>;
        const members = g.ZoneGroupMember
          ? Array.isArray(g.ZoneGroupMember) ? g.ZoneGroupMember : [g.ZoneGroupMember]
          : [];

        for (const member of members) {
          const m = member as Record<string, unknown>;
          const uuid = String(m['@_UUID'] || '');
          const location = String(m['@_Location'] || '');
          if (location) {
            try {
              const url = new URL(location);
              const ip = url.hostname;
              if (uuid) {
                uuidToIp.set(uuid, ip);
                const shortUuid = uuid.replace(/^RINCON_/, '').split('_')[0];
                uuidToIp.set(shortUuid, ip);
              }
            } catch { /* ignore invalid URLs */ }
          }
        }
      }

      // Reset topology on all speakers
      for (const sp of speakers) {
        updateSpeaker(sp.ip, {
          isCoordinator: false,
          groupId: '',
          coordinatorIp: '',
          groupMembers: [],
        });
      }

      // Apply topology from each group
      for (const group of groupArray) {
        const g = group as Record<string, unknown>;
        const coordinatorUuid = String(g['@_Coordinator'] || '');
        const groupId = String(g['@_ID'] || '');
        const members = g.ZoneGroupMember
          ? Array.isArray(g.ZoneGroupMember) ? g.ZoneGroupMember : [g.ZoneGroupMember]
          : [];

        const coordinatorIp = uuidToIp.get(coordinatorUuid) || '';
        const memberIps: string[] = [];

        for (const member of members) {
          const m = member as Record<string, unknown>;
          const uuid = String(m['@_UUID'] || '');
          const location = String(m['@_Location'] || '');
          let memberIp = uuidToIp.get(uuid) || '';

          if (!memberIp && location) {
            try {
              const url = new URL(location);
              memberIp = url.hostname;
              if (!speakerMap.has(memberIp)) {
                const newSpeaker: SpeakerInfo = {
                  ip: memberIp,
                  uuid: uuid.replace(/^RINCON_/, '').split('_')[0],
                  name: String(m['@_ZoneName'] || memberIp),
                  model: 'Sonos',
                  isCoordinator: false,
                  groupId: '',
                  coordinatorIp: '',
                  groupMembers: [],
                };
                speakerMap.set(memberIp, newSpeaker);
              }
              uuidToIp.set(uuid, memberIp);
            } catch { /* ignore invalid URLs */ }
          }

          if (memberIp) memberIps.push(memberIp);
        }

        for (const memberIp of memberIps) {
          updateSpeaker(memberIp, {
            isCoordinator: memberIp === coordinatorIp,
            groupId,
            coordinatorIp,
            groupMembers: memberIps,
          });
        }
      }

      return;
    } catch (err) {
      console.error(`[Topology] Error fetching from ${speaker.ip}:`, (err as Error).message);
    }
  }
}

function startTopologyPolling(): void {
  void fetchTopology();
  topologyTimer = setInterval(() => void fetchTopology(), 30000);
}

function stopTopologyPolling(): void {
  if (topologyTimer) clearInterval(topologyTimer);
}

function getTopology(): SpeakerInfo[] {
  return getSpeakers();
}

export { startTopologyPolling, stopTopologyPolling, fetchTopology, getTopology };
