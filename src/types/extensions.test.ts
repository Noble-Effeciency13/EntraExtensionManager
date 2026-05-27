import { describe, expect, it } from 'vitest';
import {
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
