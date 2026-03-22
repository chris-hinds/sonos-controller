import { soapCall } from './soap.js';
import type { VolumeEntry } from '../../../shared/types.js';

const SERVICE_PATH = '/MediaRenderer/RenderingControl/Control';
const SERVICE_TYPE = 'urn:schemas-upnp-org:service:RenderingControl:1';

async function getVolume(ip: string): Promise<number> {
  const res = await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'GetVolume', {
    InstanceID: 0,
    Channel: 'Master',
  });
  const body = res?.['s:Envelope']?.['s:Body'] || res?.Envelope?.Body || {};
  const resp = body['u:GetVolumeResponse'] || body['GetVolumeResponse'] || {};
  return parseInt(resp.CurrentVolume ?? '0', 10);
}

async function setVolume(ip: string, volume: number): Promise<void> {
  const clamped = Math.max(0, Math.min(100, Math.round(volume)));
  await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'SetVolume', {
    InstanceID: 0,
    Channel: 'Master',
    DesiredVolume: clamped,
  });
}

async function getMute(ip: string): Promise<boolean> {
  const res = await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'GetMute', {
    InstanceID: 0,
    Channel: 'Master',
  });
  const body = res?.['s:Envelope']?.['s:Body'] || res?.Envelope?.Body || {};
  const resp = body['u:GetMuteResponse'] || body['GetMuteResponse'] || {};
  return resp.CurrentMute === '1' || resp.CurrentMute === true || resp.CurrentMute === 1;
}

async function setMute(ip: string, muted: boolean): Promise<void> {
  await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'SetMute', {
    InstanceID: 0,
    Channel: 'Master',
    DesiredMute: muted ? 1 : 0,
  });
}

async function getVolumeAndMute(ip: string): Promise<VolumeEntry> {
  try {
    const [volume, mute] = await Promise.all([getVolume(ip), getMute(ip)]);
    return { volume, mute };
  } catch (err) {
    console.error(`[RenderingControl] Error getting volume/mute for ${ip}:`, (err as Error).message);
    return { volume: 0, mute: false };
  }
}

export { getVolume, setVolume, getMute, setMute, getVolumeAndMute };
