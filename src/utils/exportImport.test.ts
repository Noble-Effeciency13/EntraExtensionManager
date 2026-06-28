import { describe, expect, it } from 'vitest';
import { toCsv } from './exportImport';

describe('toCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('');
  });

  it('emits a header row from the union of keys', () => {
    const csv = toCsv([{ a: 1 }, { b: 2 }]);
    expect(csv.split('\r\n')[0]).toBe('a,b');
  });

  it('quotes values containing commas, quotes or newlines', () => {
    const csv = toCsv([{ a: 'x,y', b: 'he said "hi"', c: 'line1\nline2' }]);
    expect(csv).toContain('"x,y"');
    expect(csv).toContain('"he said ""hi"""');
    expect(csv).toContain('"line1\nline2"');
  });

  it('joins array values with a pipe', () => {
    expect(toCsv([{ a: ['User', 'Group'] }])).toContain('User|Group');
  });

  it('neutralizes CSV formula injection with a leading apostrophe', () => {
    const valuesRow = toCsv([{ a: '=1+1', b: '+x', c: '-y', d: '@z' }]).split(
      '\r\n',
    )[1];
    expect(valuesRow).toBe("'=1+1,'+x,'-y,'@z");
  });

  it('renders null/undefined as empty cells', () => {
    expect(toCsv([{ a: null, b: undefined, c: 'x' }]).split('\r\n')[1]).toBe(
      ',,x',
    );
  });
});
