import { describe, expect, it } from 'vitest';
import { escapeODataString } from './odata';

describe('escapeODataString', () => {
  it('doubles single quotes', () => {
    expect(escapeODataString("a'b")).toBe("a''b");
    expect(escapeODataString("O'Brien's")).toBe("O''Brien''s");
  });

  it('leaves clean values unchanged', () => {
    expect(escapeODataString('contoso_courses')).toBe('contoso_courses');
    expect(escapeODataString('')).toBe('');
  });

  it('blocks filter break-out attempts', () => {
    // A naive interpolation of this into `name eq '...'` would terminate the
    // literal; escaping keeps it inside the string.
    expect(escapeODataString("x' or '1' eq '1")).toBe("x'' or ''1'' eq ''1");
  });
});
