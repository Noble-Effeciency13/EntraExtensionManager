import { beforeEach, describe, expect, it } from 'vitest';
import { createDemoGraphClient } from './demoClient';
import { resetDemoStore } from './demoData';

// The fake client is structurally typed; cast results to read fields in tests.
function client() {
  return createDemoGraphClient() as unknown as {
    api: (path: string) => {
      filter: (f: string) => ReturnType<ReturnType<typeof createDemoGraphClient>['api']>;
      get: () => Promise<unknown>;
      post: (body: Record<string, unknown>) => Promise<unknown>;
    };
  };
}

describe('demo graph client', () => {
  beforeEach(() => resetDemoStore());

  it('lists seeded schema extensions', async () => {
    const res = (await client().api('/schemaExtensions').get()) as {
      value: unknown[];
    };
    expect(res.value.length).toBeGreaterThan(0);
  });

  it('filters schema extensions by status', async () => {
    const res = (await client()
      .api('/schemaExtensions')
      .filter("status eq 'Available'")
      .get()) as { value: Array<{ status: string }> };
    expect(res.value.length).toBeGreaterThan(0);
    expect(res.value.every((s) => s.status === 'Available')).toBe(true);
  });

  it('creates a schema extension that then appears in the list', async () => {
    await client()
      .api('/schemaExtensions')
      .post({
        id: 'widget',
        description: 'A widget',
        targetTypes: ['User'],
        properties: [{ name: 'code', type: 'String' }],
      });
    const res = (await client().api('/schemaExtensions').get()) as {
      value: Array<{ id: string }>;
    };
    // A bare id is qualified with a generated ext{rand}_ prefix.
    expect(res.value.some((s) => s.id.endsWith('_widget'))).toBe(true);
  });

  it('counts directory objects for a usage probe filter', async () => {
    const n = (await client()
      .api('/users/$count')
      .filter('extlearn01_courses/courseId ne null')
      .get()) as number;
    expect(typeof n).toBe('number');
    expect(n).toBeGreaterThan(0);
  });

  it('returns seeded audit log entries for demo mode', async () => {
    const res = (await client().api('/auditLogs/directoryAudits').get()) as {
      value: Array<{ activityDisplayName: string; result: string }>;
    };
    expect(res.value.length).toBeGreaterThan(0);
    expect(res.value[0].activityDisplayName).toBeTruthy();
    expect(res.value.some((entry) => entry.result === 'success')).toBe(true);
  });

  it('returns an empty collection for unknown routes', async () => {
    const res = (await client().api('/unknown/route').get()) as {
      value: unknown[];
    };
    expect(res.value).toEqual([]);
  });
});
