import { Navigate, Route, Routes } from 'react-router-dom';
import { SchemaExtensionsPage } from '@/features/schemaExtensions/SchemaExtensionsPage';
import { DirectoryExtensionsPage } from '@/features/directoryExtensions/DirectoryExtensionsPage';
import { AuditLogPage } from '@/features/tools/AuditLogPage';
import { UsagePage } from '@/features/tools/UsagePage';
import { ValidateValuePage } from '@/features/tools/ValidateValuePage';
import { ManifestSnippetPage } from '@/features/tools/ManifestSnippetPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/schema-extensions" replace />} />
      <Route path="/schema-extensions" element={<SchemaExtensionsPage />} />
      <Route path="/directory-extensions" element={<DirectoryExtensionsPage />} />
      <Route path="/directory-extensions/:appObjectId" element={<DirectoryExtensionsPage />} />
      <Route path="/tools/audit-log" element={<AuditLogPage />} />
      <Route path="/tools/usage" element={<UsagePage />} />
      <Route path="/tools/validate-value" element={<ValidateValuePage />} />
      <Route path="/tools/manifest-snippet" element={<ManifestSnippetPage />} />
      <Route path="*" element={<Navigate to="/schema-extensions" replace />} />
    </Routes>
  );
}
