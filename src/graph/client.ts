import { Client, AuthenticationProvider } from '@microsoft/microsoft-graph-client';

class StaticTokenAuthProvider implements AuthenticationProvider {
  constructor(private readonly token: string) {}
  async getAccessToken(): Promise<string> {
    return this.token;
  }
}

export function createGraphClient(token: string): Client {
  return Client.initWithMiddleware({
    authProvider: new StaticTokenAuthProvider(token),
    defaultVersion: 'v1.0',
  });
}
