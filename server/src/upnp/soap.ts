import { XMLParser } from 'fast-xml-parser';

function escapeXml(str: unknown): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function secondsToHMS(n: number): string {
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = Math.floor(n % 60);
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function hmsToSeconds(str: string | undefined): number {
  if (!str || str === 'NOT_IMPLEMENTED') return 0;
  const parts = str.split(':').map(Number);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

// Parsed XML from Sonos is inherently untyped — any is correct here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function soapCall(
  ip: string,
  path: string,
  serviceType: string,
  action: string,
  args: Record<string, string | number> = {},
  timeoutMs = 8000
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const argsXml = Object.entries(args)
    .map(([k, v]) => `<${k}>${escapeXml(v)}</${k}>`)
    .join('\n');

  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"
            s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:${action} xmlns:u="${serviceType}">
      ${argsXml}
    </u:${action}>
  </s:Body>
</s:Envelope>`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`http://${ip}:1400${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset="utf-8"',
        'SOAPACTION': `"${serviceType}#${action}"`,
      },
      body: envelope,
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`SOAP error ${res.status}: ${await res.text()}`);
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    return parser.parse(await res.text());
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(`SOAP timeout (${timeoutMs}ms): ${action} on ${ip}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export { soapCall, escapeXml, secondsToHMS, hmsToSeconds };
