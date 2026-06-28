import { describe, expect, it } from 'vitest';
import {
  directoryExtensionManifest,
  schemaExtensionManifest,
} from './manifest';
import type {
  DirectoryExtensionProperty,
  SchemaExtension,
} from '@/types/extensions';

const schema: SchemaExtension = {
  id: 'contoso_courses',
  description: 'Courses',
  targetTypes: ['User'],
  properties: [{ name: 'courseId', type: 'Integer' }],
  status: 'Available',
  owner: '11111111-1111-1111-1111-111111111111',
};

const dirExt: DirectoryExtensionProperty = {
  id: 'x',
  name: `extension_${'a'.repeat(32)}_employeeRegion`,
  dataType: 'String',
  targetObjects: ['User'],
  isSyncedFromOnPremises: false,
};

describe('schemaExtensionManifest', () => {
  it('strips the verified-domain prefix from the id', () => {
    const body = JSON.parse(schemaExtensionManifest(schema));
    expect(body.id).toBe('courses');
    expect(body.targetTypes).toEqual(['User']);
    expect(body.properties).toEqual([{ name: 'courseId', type: 'Integer' }]);
  });
});

describe('directoryExtensionManifest', () => {
  it('strips the extension_{appId}_ prefix from the name', () => {
    const body = JSON.parse(directoryExtensionManifest(dirExt));
    expect(body.name).toBe('employeeRegion');
    expect(body.dataType).toBe('String');
  });
});
