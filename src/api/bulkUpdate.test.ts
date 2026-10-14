import type { Client } from '@microsoft/microsoft-graph-client';
import { describe, expect, it, vi } from 'vitest';
import {
  listBulkObjects,
  parseBulkValue,
  updateBulkObjects,
  type BulkExtension,
} from './bulkUpdate';

const directory: BulkExtension = {
  variant: 'directory',
  ext: {
    id: 'ext',
    name: 'extension_app_flag',
    dataType: 'Boolean',
    targetObjects: ['User', 'Group'],
    isSyncedFromOnPremises: false,
  },
};
const schema: BulkExtension = {
  variant: 'schema',
  ext: {
    id: 'ext_config',
    owner: 'app',
    status: 'Available',
    targetTypes: ['User', 'Group'],
    properties: [
      { name: 'enabled', type: 'Boolean' },
      { name: 'count', type: 'Integer' },
    ],
  },
};

function mockClient(
  pages: Record<string, unknown> = {},
  patch = vi.fn().mockResolvedValue(undefined),
) {
  const api = vi.fn((path: string) => {
    const request = {
      select: vi.fn(() => request),
      top: vi.fn(() => request),
      header: vi.fn(() => request),
      count: vi.fn(() => request),
      filter: vi.fn(() => request),
      get: vi.fn().mockResolvedValue(pages[path]),
      patch: vi.fn((body: unknown) => patch(path, body)),
    };
    return request;
  });
  return { client: { api } as unknown as Client, api, patch };
}

describe('bulk object discovery', () => {
  it('filters every page by combined user properties and extension attributes', async () => {
    const { client, api } = mockClient({
      '/users': {
        value: [
          {
            id: 'one',
            displayName: 'One',
            department: 'Engineering',
            onPremisesExtensionAttributes: { extensionAttribute15: 'West' },
          },
        ],
        '@odata.nextLink': '/users?page=2',
      },
      '/users?page=2': {
        value: [
          {
            id: 'two',
            department: 'Engineering',
            onPremisesExtensionAttributes: { extensionAttribute15: 'East' },
          },
        ],
      },
    });
    expect(
      await listBulkObjects(
        client,
        ['User', 'Group'],
        [
          { property: 'department', operator: 'eq', value: 'Engineering' },
          { property: 'extensionAttribute15', operator: 'eq', value: 'West' },
        ],
      ),
    ).toEqual([{ id: 'one', displayName: 'One', targetType: 'User' }]);
    expect(api).not.toHaveBeenCalledWith('/groups');
    const first = api.mock.results[0].value;
    expect(first.filter).toHaveBeenCalledWith("department eq 'Engineering'");
    expect(api.mock.results[1].value.header).toHaveBeenCalledWith('ConsistencyLevel', 'eventual');
  });

  it('resolves direct group and administrative unit membership once per condition and follows member pages', async () => {
    const group = '11111111-1111-1111-1111-111111111111';
    const unit = '22222222-2222-2222-2222-222222222222';
    const { client } = mockClient({
      [`/groups/${group}/members`]: { value: [{ id: 'one' }], '@odata.nextLink': '/member-page-2' },
      '/member-page-2': { value: [{ id: 'two' }] },
      [`/directory/administrativeUnits/${unit}/members`]: { value: [{ id: 'two' }] },
      '/users': { value: [{ id: 'one' }, { id: 'two' }, { id: 'three' }] },
    });
    expect(
      await listBulkObjects(
        client,
        ['User'],
        [
          { property: 'groupMembership', operator: 'eq', value: group },
          { property: 'administrativeUnitMembership', operator: 'ne', value: unit },
        ],
      ),
    ).toEqual([{ id: 'one', displayName: 'one', targetType: 'User' }]);
  });

  it('fails closed for invalid filters, inaccessible memberships, and cancelled discovery', async () => {
    const { client, api } = mockClient();
    await expect(
      listBulkObjects(client, ['User'], [{ property: 'unknown', operator: 'eq', value: 'x' }]),
    ).rejects.toThrow('Unknown');
    expect(api).not.toHaveBeenCalled();
    const controller = new AbortController();
    controller.abort();
    await expect(listBulkObjects(client, ['User'], [], controller.signal)).rejects.toThrow();
    await expect(
      listBulkObjects(
        client,
        ['User'],
        [
          {
            property: 'groupMembership',
            operator: 'eq',
            value: '11111111-1111-1111-1111-111111111111',
          },
        ],
      ),
    ).rejects.toThrow();
  });

  it('includes every page and every chosen type, even objects without extension values', async () => {
    const { client, api } = mockClient({
      '/users': {
        value: [{ id: 'same', displayName: 'First' }],
        '@odata.nextLink': '/users?page=2',
      },
      '/users?page=2': { value: [{ id: 'second' }] },
      '/groups': { value: [{ id: 'same', displayName: 'Group' }] },
    });
    expect(await listBulkObjects(client, ['User', 'Group'])).toEqual([
      { targetType: 'User', id: 'same', displayName: 'First' },
      { targetType: 'User', id: 'second', displayName: 'second' },
      { targetType: 'Group', id: 'same', displayName: 'Group' },
    ]);
    expect(api).toHaveBeenCalledWith('/users?page=2');
  });

  it('rejects incomplete discovery rather than returning a partial all-objects set', async () => {
    const { client } = mockClient({ '/users': { value: [{ id: 'one' }] } });
    await expect(listBulkObjects(client, ['User', 'Message'])).rejects.toThrow('Unsupported');
  });
});

describe('bulk update', () => {
  const objects = [
    { targetType: 'User', id: 'one', displayName: 'One' },
    { targetType: 'Group', id: 'two', displayName: 'Two' },
    { targetType: 'User', id: 'three', displayName: 'Three' },
  ];

  it('writes once per selected object across types and continues after failures', async () => {
    const patch = vi
      .fn()
      .mockResolvedValue(undefined)
      .mockRejectedValueOnce(new Error('Forbidden'));
    const { client } = mockClient({}, patch);
    const progress = vi.fn();
    const results = await updateBulkObjects(
      client,
      directory,
      [...objects, objects[1]],
      'true',
      progress,
    );
    expect(patch.mock.calls).toEqual(
      objects.map((object) => [
        `/${object.targetType === 'User' ? 'users' : 'groups'}/${object.id}`,
        { extension_app_flag: true },
      ]),
    );
    expect(results.map((result) => result.success)).toEqual([false, true, true]);
    expect(results[0].error).toBe('Forbidden');
    expect(progress).toHaveBeenLastCalledWith(3, 3);
  });

  it('writes schema properties as a nested object without dry-run cleanup', async () => {
    const { client, patch } = mockClient();
    await updateBulkObjects(client, schema, [objects[0]], '{"enabled":false,"count":42}');
    expect(patch).toHaveBeenCalledExactlyOnceWith('/users/one', {
      ext_config: { enabled: false, count: 42 },
    });
  });

  it('validates the entire selection and configuration before any writes', async () => {
    const { client, patch } = mockClient();
    await expect(
      updateBulkObjects(
        client,
        directory,
        [...objects, { ...objects[0], targetType: 'Device' }],
        'true',
      ),
    ).rejects.toThrow('Invalid target');
    await expect(updateBulkObjects(client, directory, objects, '"false"')).rejects.toThrow(
      'Boolean',
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it('only writes the explicitly selected subset', async () => {
    const { client, patch } = mockClient();
    await updateBulkObjects(client, directory, [objects[1]], 'false');
    expect(patch).toHaveBeenCalledExactlyOnceWith('/groups/two', { extension_app_flag: false });
  });

  it('stops issuing writes if write mode is revoked during an operation', async () => {
    const { client, patch } = mockClient();
    const canWrite = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    const results = await updateBulkObjects(
      client,
      directory,
      objects,
      'true',
      undefined,
      canWrite,
    );
    expect(patch).toHaveBeenCalledTimes(1);
    expect(results.map((result) => result.success)).toEqual([true, false, false]);
    expect(results[1].error).toContain('Edit mode');
  });
});

describe('bulk value validation', () => {
  it('rejects unknown properties, nulls, arrays, invalid types and integer overflow', () => {
    for (const text of [
      '{}',
      'null',
      '[]',
      '{"unknown":true}',
      '{"enabled":"true"}',
      '{"count":1.5}',
      '{"count":2147483648}',
    ]) {
      expect(() => parseBulkValue(schema, text)).toThrow();
    }
  });

  it('accepts partial schema configuration and preserves string whitespace', () => {
    expect(parseBulkValue(schema, '{"enabled":false}')).toEqual({ enabled: false });
    expect(
      parseBulkValue({ ...directory, ext: { ...directory.ext, dataType: 'String' } }, ' value '),
    ).toBe(' value ');
  });
});
