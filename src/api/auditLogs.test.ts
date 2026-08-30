import { describe, expect, it } from 'vitest';
import {
  matchesExtensionAuditEntry,
  summarizeAuditEntry,
  type AuditEntry,
} from './auditLogs';

describe('matchesExtensionAuditEntry', () => {
  it('matches extension use through modified properties as well as target resources', () => {
    const entry: AuditEntry = {
      id: 'audit-1',
      activityDateTime: '2026-01-15T12:00:00Z',
      activityDisplayName: 'Update user',
      category: 'UserManagement',
      result: 'success',
      initiatedBy: {
        user: { displayName: 'Admin 1', userPrincipalName: 'admin@contoso.com' },
      },
      targetResources: [{ id: 'user-42', displayName: 'User A', type: 'User' }],
      modifiedProperties: [
        {
          displayName: 'extension_0123456789abcdef0123456789abcdef_employeeId',
          newValue: '42',
        },
      ],
    };

    expect(
      matchesExtensionAuditEntry(
        entry,
        '0123456789abcdef0123456789abcdef',
        'extension_0123456789abcdef0123456789abcdef_employeeId',
      ),
    ).toBe(true);
  });
});

describe('summarizeAuditEntry', () => {
  it('adds the impacted user/resource and property value to the audit description', () => {
    const entry: AuditEntry = {
      id: 'audit-2',
      activityDateTime: '2026-01-15T12:00:00Z',
      activityDisplayName: 'Update user',
      category: 'UserManagement',
      result: 'success',
      initiatedBy: {
        user: { displayName: 'Admin 2', userPrincipalName: 'admin2@contoso.com' },
      },
      targetResources: [{ id: 'user-42', displayName: 'User A', type: 'User' }],
      modifiedProperties: [
        {
          displayName: 'extension_0123456789abcdef0123456789abcdef_employeeId',
          newValue: '42',
        },
      ],
    };

    const summary = summarizeAuditEntry(
      entry,
      '0123456789abcdef0123456789abcdef',
      'extension_0123456789abcdef0123456789abcdef_employeeId',
    );

    expect(summary.activity).toContain('Update user');
    expect(summary.target).toContain('User A');
    expect(summary.detail).toContain('employeeId');
    expect(summary.detail).toContain('42');
  });
});
