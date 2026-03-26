declare module 'node-ssdp' {
  export interface SsdpHeaders {
    LOCATION?: string;
    location?: string;
    [key: string]: string | undefined;
  }

  export class Client {
    search(serviceType: string): void;
    stop(): void;
    on(event: 'response', listener: (headers: SsdpHeaders) => void): this;
  }

  interface NodeSsdp {
    Client: typeof Client;
  }

  const nodeSsdp: NodeSsdp;
  export default nodeSsdp;
}
