import { GraphError } from '@microsoft/microsoft-graph-client';

export interface NormalizedError {
  code: string;
  message: string;
  requestId?: string;
  status?: number;
}

export function normalizeGraphError(err: unknown): NormalizedError {
  if (err instanceof GraphError) {
    return {
      code: err.code ?? 'GraphError',
      message: err.message ?? 'Unknown Graph error.',
      requestId: err.requestId ?? undefined,
      status: err.statusCode,
    };
  }
  if (err instanceof Error) {
    return { code: err.name || 'Error', message: err.message };
  }
  return { code: 'UnknownError', message: String(err) };
}
