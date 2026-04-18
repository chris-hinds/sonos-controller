import { useState, useCallback } from 'react';
import * as Network from 'expo-network';
import { posthog } from '@/lib/posthog';

export interface ScanResult {
  url: string;
  name: string;
}

const SCAN_PORT = 3001;
const SCAN_TIMEOUT_MS = 1500;
const BATCH_SIZE = 40;

async function probeHost(host: string, port: number): Promise<ScanResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
  try {
    // Try /api/hello first (new endpoint); fall back to /api/speakers (always exists)
    const url = `http://${host}:${port}`;
    let res = await fetch(`${url}/api/hello`, { signal: controller.signal });
    if (res.ok) {
      clearTimeout(timer);
      const data = (await res.json()) as { name?: string };
      return { url, name: data.name ?? 'Kyuu' };
    }
    // hello returned non-ok (old server without the endpoint returns 404) — treat as found
    if (res.status === 404) {
      clearTimeout(timer);
      return { url, name: 'Kyuu' };
    }
    clearTimeout(timer);
    return null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function scanSubnet(subnet: string, port: number): Promise<ScanResult[]> {
  const hosts = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);
  const found: ScanResult[] = [];

  for (let i = 0; i < hosts.length; i += BATCH_SIZE) {
    const batch = hosts.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((h) => probeHost(h, port)));
    for (const r of results) {
      if (r) found.push(r);
    }
  }

  return found;
}

export function useNetworkScan() {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setScanning(true);
    setResults([]);
    setError(null);
    const scanStart = Date.now();
    posthog.capture('server_scan_started');

    try {
      const ip = await Network.getIpAddressAsync();
      if (!ip || ip === '0.0.0.0') {
        setError('Not connected to Wi-Fi');
        return;
      }

      const parts = ip.split('.');
      if (parts.length !== 4) {
        setError('Could not determine network subnet');
        return;
      }

      const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
      const found = await scanSubnet(subnet, SCAN_PORT);

      posthog.capture('server_scan_completed', { found: found.length, duration_ms: Date.now() - scanStart });
      if (found.length === 0) {
        setError('No servers found on your network');
      } else {
        setResults(found);
      }
    } catch (e) {
      setError('Scan failed: ' + String(e));
    } finally {
      setScanning(false);
    }
  }, []);

  return { scanning, results, error, scan };
}
