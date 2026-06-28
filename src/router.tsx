import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spinner, makeStyles } from '@fluentui/react-components';

// Route-level code splitting: each page is its own chunk, loaded on demand so
// the initial bundle only includes the shell. Pages use named exports, so map
// them to the default export shape React.lazy expects.
const SchemaExtensionsPage = lazy(() =>
  import('@/features/schemaExtensions/SchemaExtensionsPage').then((m) => ({
    default: m.SchemaExtensionsPage,
  })),
);
const DirectoryExtensionsPage = lazy(() =>
  import('@/features/directoryExtensions/DirectoryExtensionsPage').then((m) => ({
    default: m.DirectoryExtensionsPage,
  })),
);
const OpenExtensionsPage = lazy(() =>
  import('@/features/openExtensions/OpenExtensionsPage').then((m) => ({
    default: m.OpenExtensionsPage,
  })),
);
const AuditLogPage = lazy(() =>
  import('@/features/tools/AuditLogPage').then((m) => ({
    default: m.AuditLogPage,
  })),
);
const UsagePage = lazy(() =>
  import('@/features/tools/UsagePage').then((m) => ({ default: m.UsagePage })),
);
const ValidateValuePage = lazy(() =>
  import('@/features/tools/ValidateValuePage').then((m) => ({
    default: m.ValidateValuePage,
  })),
);
const ManifestSnippetPage = lazy(() =>
  import('@/features/tools/ManifestSnippetPage').then((m) => ({
    default: m.ManifestSnippetPage,
  })),
);

const useStyles = makeStyles({
  fallback: {
    display: 'flex',
    justifyContent: 'center',
    padding: '64px',
  },
});

function RouteFallback() {
  const styles = useStyles();
  return (
    <div className={styles.fallback}>
      <Spinner label="Loading…" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/directory-extensions" replace />} />
        <Route path="/schema-extensions" element={<SchemaExtensionsPage />} />
        <Route path="/directory-extensions" element={<DirectoryExtensionsPage />} />
        <Route
          path="/directory-extensions/:appObjectId"
          element={<DirectoryExtensionsPage />}
        />
        <Route path="/open-extensions" element={<OpenExtensionsPage />} />
        <Route path="/tools/audit-log" element={<AuditLogPage />} />
        <Route path="/tools/usage" element={<UsagePage />} />
        <Route path="/tools/validate-value" element={<ValidateValuePage />} />
        <Route path="/tools/manifest-snippet" element={<ManifestSnippetPage />} />
        <Route path="*" element={<Navigate to="/directory-extensions" replace />} />
      </Routes>
    </Suspense>
  );
}
