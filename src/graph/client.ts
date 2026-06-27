import { Client, AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { DEMO_GRAPH_TOKEN, createDemoGraphClient } from '@/demo/demoClient';

class StaticTokenAuthProvider implements AuthenticationProvider {
  constructor(private readonly token: string) {}
  async getAccessToken(): Promise<string> {
    return this.token;
  }
}

export function createGraphClient(token: string): Client {
  // In demo mode the API layer passes a sentinel token; serve everything from
  // the in-memory simulated tenant instead of hitting Microsoft Graph.
  if (token === DEMO_GRAPH_TOKEN) {
    return createDemoGraphClient() as unknown as Client;
  }
  return Client.initWithMiddleware({
    authProvider: new StaticTokenAuthProvider(token),
    defaultVersion: 'v1.0',
  });
}
