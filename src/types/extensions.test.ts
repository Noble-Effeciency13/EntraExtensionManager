import { describe, expect, it } from 'vitest';
import {
  allowedPropertyTypesForTargets,
  directoryExtensionFormSchema,
  schemaExtensionFormSchema,
} from './extensions';

describe('schemaExtensionFormSchema', () => {
  it('accepts a valid schema extension', () => {
    const result = schemaExtensionFormSchema.safeParse({
      id: 'courses',
      description: 'Course catalog',
      targetTypes: ['User'],
      properties: [{ name: 'courseId', type: 'String' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty target types', () => {
    const result = schemaExtensionFormSchema.safeParse({
      id: 'courses',
      targetTypes: [],
      properties: [{ name: 'courseId', type: 'String' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid property names', () => {
    const result = schemaExtensionFormSchema.safeParse({
      id: 'courses',
      targetTypes: ['User'],
      properties: [{ name: '1bad', type: 'String' }],
    });
    expect(result.success).toBe(false);
  });

  it('requires a description', () => {
    const result = schemaExtensionFormSchema.safeParse({
      id: 'courses',
      description: '',
      targetTypes: ['User'],
      properties: [{ name: 'courseId', type: 'String' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects Binary properties on messaging target types', () => {
    const result = schemaExtensionFormSchema.safeParse({
      id: 'courses',
      description: 'Course catalog',
      targetTypes: ['Message'],
      properties: [{ name: 'blob', type: 'Binary' }],
    });
    expect(result.success).toBe(false);
  });

  it('allows Binary properties on directory target types', () => {
    const result = schemaExtensionFormSchema.safeParse({
      id: 'courses',
      description: 'Course catalog',
      targetTypes: ['User', 'Group'],
      properties: [{ name: 'blob', type: 'Binary' }],
    });
    expect(result.success).toBe(true);
  });
});

describe('allowedPropertyTypesForTargets', () => {
  it('excludes Binary when a messaging target is selected', () => {
    expect(allowedPropertyTypesForTargets(['User', 'Message'])).not.toContain(
      'Binary',
    );
  });

  it('includes Binary for directory-only targets', () => {
    expect(allowedPropertyTypesForTargets(['User', 'Group'])).toContain('Binary');
  });
});

describe('directoryExtensionFormSchema', () => {
  it('accepts a valid extension property', () => {
    const result = directoryExtensionFormSchema.safeParse({
      name: 'employeeRegion',
      dataType: 'String',
      targetObjects: ['User'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-alphanumeric names', () => {
    const result = directoryExtensionFormSchema.safeParse({
      name: 'employee_region',
      dataType: 'String',
      targetObjects: ['User'],
    });
    expect(result.success).toBe(false);
  });
});
