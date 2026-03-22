import { soapCall } from './soap.js';
import { XMLParser } from 'fast-xml-parser';
import type { ContentItem, FavoriteItem, QueueItem } from '../../../shared/types.js';

const SERVICE_PATH = '/MediaServer/ContentDirectory/Control';
const SERVICE_TYPE = 'urn:schemas-upnp-org:service:ContentDirectory:1';

const didlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name: string) => ['item', 'container'].includes(name),
});

function decodeXmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseDidlList(resultXml: string): any[] {
  if (!resultXml) return [];
  try {
    const decoded = decodeXmlEntities(resultXml);
    const parsed = didlParser.parse(decoded);
    const didl = parsed?.['DIDL-Lite'] || {};
    return [
      ...(Array.isArray(didl.item) ? didl.item : didl.item ? [didl.item] : []),
      ...(Array.isArray(didl.container) ? didl.container : didl.container ? [didl.container] : []),
    ];
  } catch (err) {
    console.error('[ContentDirectory] Error parsing DIDL:', (err as Error).message);
    return [];
  }
}

// Extract each raw <item>/<container> wrapped in a DIDL-Lite envelope — required
// as metadata for SetAVTransportURI/AddURIToQueue.
function extractRawItemMetadata(resultXml: string): string[] {
  if (!resultXml) return [];
  // Decode outer escaping (resultXml may be double-encoded from SOAP parser), then
  // re-encode bare & characters in element text content that were left by decoding.
  // Without this, URIs like "?sid=204&flags=8300" become invalid XML and Sonos
  // returns error 714 when the metadata is sent back via SetAVTransportURI.
  const decoded = decodeXmlEntities(resultXml)
    .replace(/&(?![a-zA-Z#][a-zA-Z0-9]*;)/g, '&amp;');
  const headerMatch = decoded.match(/<DIDL-Lite[^>]*>/);
  const header = headerMatch
    ? headerMatch[0]
    : '<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/">';

  const blobs: string[] = [];
  // Match top-level <item> or <container> elements, accounting for nesting by
  // tracking open/close tags rather than using a non-greedy wildcard that stops
  // at the first </item> (which may be a nested element inside <r:resMD>).
  const startRe = /<(item|container)[\s> ]/g;
  let m: RegExpExecArray | null;
  while ((m = startRe.exec(decoded)) !== null) {
    const tag = m[1];
    const start = m.index;
    let depth = 1;
    let pos = m.index + m[0].length;
    const openRe = new RegExp(`<(${tag})[\\s>]|<\\/${tag}>`, 'g');
    openRe.lastIndex = pos;
    let inner: RegExpExecArray | null;
    while (depth > 0 && (inner = openRe.exec(decoded)) !== null) {
      if (inner[1]) depth++;
      else depth--;
      pos = openRe.lastIndex;
    }
    if (depth === 0) {
      blobs.push(`${header}${decoded.slice(start, pos)}</DIDL-Lite>`);
    }
    startRe.lastIndex = pos;
  }
  return blobs;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractItemInfo(item: any): ContentItem {
  const title = item['dc:title'] || item.title || '';
  const artist =
    item['dc:creator'] ||
    item['r:albumArtist'] ||
    item['upnp:artist'] ||
    item.artist ||
    '';
  const album = item['upnp:album'] || '';
  let albumArtURI: unknown = item['upnp:albumArtURI'] || '';
  if (Array.isArray(albumArtURI)) albumArtURI = albumArtURI[0] || '';
  if (albumArtURI && typeof albumArtURI === 'object') {
    albumArtURI = (albumArtURI as Record<string, unknown>)['#text'] || '';
  }

  const res = item.res;
  let uri = '';
  if (res) {
    if (typeof res === 'string') uri = res;
    else if (res['#text']) uri = res['#text'];
    else if (Array.isArray(res)) uri = res[0]?.['#text'] || res[0] || '';
  }

  return {
    id: item['@_id'] || '',
    title: String(title || ''),
    artist: String(artist || ''),
    album: String(album || ''),
    albumArtURI: String(albumArtURI || ''),
    uri,
    class: item['upnp:class'] || '',
  };
}

interface BrowseResponse {
  result: string;
  numberReturned: number;
  totalMatches: number;
}

async function browse(
  ip: string,
  objectId: string,
  browseFlag = 'BrowseDirectChildren',
  filter = '*',
  startingIndex = 0,
  requestedCount = 100
): Promise<BrowseResponse> {
  const res = await soapCall(ip, SERVICE_PATH, SERVICE_TYPE, 'Browse', {
    ObjectID: objectId,
    BrowseFlag: browseFlag,
    Filter: filter,
    StartingIndex: startingIndex,
    RequestedCount: requestedCount,
    SortCriteria: '',
  });
  const body = res?.['s:Envelope']?.['s:Body'] || res?.Envelope?.Body || {};
  const resp = body['u:BrowseResponse'] || body['BrowseResponse'] || {};
  return {
    result: resp.Result || '',
    numberReturned: parseInt(resp.NumberReturned || '0', 10),
    totalMatches: parseInt(resp.TotalMatches || '0', 10),
  };
}

async function getFavorites(ip: string): Promise<FavoriteItem[]> {
  try {
    const { result } = await browse(ip, 'FV:2', 'BrowseDirectChildren', '*', 0, 100);
    const items = parseDidlList(result);
    const metadataBlobs = extractRawItemMetadata(result);
    return items
      .map((item, i) => ({ ...extractItemInfo(item), metadata: metadataBlobs[i] || '' }))
      .filter(f => f.uri); // shortcut-type items have no URI and aren't directly playable
  } catch (err) {
    console.error(`[ContentDirectory] getFavorites error for ${ip}:`, (err as Error).message);
    return [];
  }
}

async function getQueue(ip: string): Promise<QueueItem[]> {
  try {
    const { result } = await browse(ip, 'Q:0', 'BrowseDirectChildren', '*', 0, 200);
    const items = parseDidlList(result);
    return items.map((item, index) => ({
      ...extractItemInfo(item),
      index,
    }));
  } catch (err) {
    console.error(`[ContentDirectory] getQueue error for ${ip}:`, (err as Error).message);
    return [];
  }
}

async function getSonosPlaylists(ip: string): Promise<ContentItem[]> {
  try {
    const { result } = await browse(ip, 'SQ:', 'BrowseDirectChildren', '*', 0, 100);
    const items = parseDidlList(result);
    return items.map(extractItemInfo);
  } catch (err) {
    console.error(`[ContentDirectory] getSonosPlaylists error for ${ip}:`, (err as Error).message);
    return [];
  }
}

export { getFavorites, getQueue, getSonosPlaylists, browse };
