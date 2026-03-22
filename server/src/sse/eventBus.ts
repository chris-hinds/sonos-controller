import type { Response } from 'express';

const clients = new Set<Response>();

function addClient(res: Response): () => void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.write(':ok\n\n');
  clients.add(res);
  return () => clients.delete(res);
}

function broadcast(eventName: string, data: unknown): void {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}

function sendToClient(res: Response, eventName: string, data: unknown): void {
  res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
}

function getClientCount(): number {
  return clients.size;
}

export { addClient, broadcast, sendToClient, getClientCount };
