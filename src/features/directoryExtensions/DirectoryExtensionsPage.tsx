import { useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Badge,
  Body1,
  Button,
  Caption1,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Input,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Spinner,
  TableCellLayout,
  TableColumnDefinition,
  TableColumnSizingOptions,
  Title2,
  Tooltip,
  createTableColumn,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Add24Regular,
  ArrowDownload24Regular,
  ArrowSync24Regular,
  ArrowUpload24Regular,
  ClipboardCode24Regular,
  Code24Regular,
  DataPie24Regular,
  Delete24Regular,
  ExtendedDock24Regular,
  History24Regular,
  Info24Regular,
  MoreHorizontal24Regular,
  PlayCircle24Regular,
  Search24Regular,
} from '@fluentui/react-icons';
import {
  useAllDirectoryExtensions,
  useDeleteExtensionProperty,
  useImportExtensionProperty,
} from '@/api/directoryExtensions';
import type {
  AppRegistration,
  DirectoryExtensionForm,
  DirectoryExtensionProperty,
} from '@/types/extensions';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ExtensionInfoDialog } from '@/components/ExtensionInfoDialog';
import { UsageDialog } from '@/components/UsageDialog';
import { AuditLogDialog } from '@/components/AuditLogDialog';
import { ManifestSnippetDialog } from '@/components/ManifestSnippetDialog';
import { ValidateValueDialog } from '@/components/ValidateValueDialog';
import { ImportDialog } from '@/components/ImportDialog';
import { DirectoryExtensionEditor } from './DirectoryExtensionEditor';
import { useAppToast } from '@/hooks/useAppToast';
import { useMode } from '@/auth/mode';
import { usePageShortcut } from '@/hooks/useKeyboardShortcuts';
import {
  downloadCsv,
  downloadJson,
  timestampSuffix,
} from '@/utils/exportImport';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  hint: { marginBottom: '12px' },
  filters: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  group: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow4,
    marginBottom: '12px',
    overflow: 'hidden',
  },
  appHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
  },
  appTitle: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  appName: { fontWeight: 600 },
  appId: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontFamily: tokens.fontFamilyMonospace,
  },
  count: { marginLeft: 'auto' },
  panel: { padding: '4px 16px 16px' },
  panelActions: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '8px',
    gap: '8px',
  },
  loading: { display: 'flex', justifyContent: 'center', padding: '64px' },
});

interface PendingAddState {
  app?: AppRegistration;
}

interface ActionTarget {
  app: AppRegistration;
  ext: DirectoryExtensionProperty;
}

export function DirectoryExtensionsPage() {
  const styles = useStyles();
  const toast = useAppToast();
  const { isEdit } = useMode();
  const { data, isLoading, isFetching, refetch, error } = useAllDirectoryExtensions();

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<PendingAddState | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Per-row dialogs
  const [deleting, setDeleting] = useState<ActionTarget | null>(null);
  const [usageOf, setUsageOf] = useState<DirectoryExtensionProperty | null>(null);
  const [auditOf, setAuditOf] = useState<DirectoryExtensionProperty | null>(null);
  const [manifestOf, setManifestOf] = useState<DirectoryExtensionProperty | null>(null);
  const [validateOf, setValidateOf] = useState<DirectoryExtensionProperty | null>(null);

  usePageShortcut('eem:new', () => {
    if (isEdit) setAdding({});
  });
  usePageShortcut('eem:focus-search', () => searchInputRef.current?.focus());

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data
      .map((g) => ({
        ...g,
        extensions: g.extensions.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.dataType.toLowerCase().includes(q) ||
            e.targetObjects.some((t) => t.toLowerCase().includes(q)),
        ),
      }))
      .filter(
        (g) =>
          g.app.displayName.toLowerCase().includes(q) ||
          g.app.appId.toLowerCase().includes(q) ||
          g.extensions.length > 0,
      );
  }, [data, search]);

  const totalApps = filtered.length;
  const totalExts = filtered.reduce((n, g) => n + g.extensions.length, 0);
  const defaultOpen = useMemo(() => filtered.map((g) => g.app.id), [filtered]);

  const exportAll = (format: 'json' | 'csv') => {
    if (format === 'json') {
      downloadJson(
        `directoryExtensions-${timestampSuffix()}.json`,
        filtered.map((g) => ({
          app: g.app,
          extensions: g.extensions,
        })),
      );
    } else {
      const rows = filtered.flatMap((g) =>
        g.extensions.map((e) => ({
          appDisplayName: g.app.displayName,
          appId: g.app.appId,
          appObjectId: g.app.id,
          name: e.name,
          dataType: e.dataType,
          targetObjects: e.targetObjects,
          isSyncedFromOnPremises: e.isSyncedFromOnPremises,
        })),
      );
      downloadCsv(`directoryExtensions-${timestampSuffix()}.csv`, rows);
    }
  };

  return (
    <>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Title2>Directory extensions</Title2>
          <Tooltip
            content="Learn more about directory extensions"
            relationship="label"
          >
            <Button
              appearance="subtle"
              icon={<Info24Regular />}
              onClick={() => setInfoOpen(true)}
              aria-label="Learn more about directory extensions"
            />
          </Tooltip>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            appearance="subtle"
            icon={<ArrowSync24Regular />}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Refresh
          </Button>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle" icon={<ArrowDownload24Regular />}>
                Export
              </Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem
                  icon={<Code24Regular />}
                  onClick={() => exportAll('json')}
                >
                  JSON (grouped by app)
                </MenuItem>
                <MenuItem onClick={() => exportAll('csv')}>CSV (flat)</MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          {isEdit && (
            <Button
              appearance="subtle"
              icon={<ArrowUpload24Regular />}
              onClick={() => setImportOpen(true)}
            >
              Import
            </Button>
          )}
          {isEdit && (
            <Button
              appearance="primary"
              icon={<Add24Regular />}
              onClick={() => setAdding({})}
            >
              New extension property
            </Button>
          )}
        </div>
      </div>

      <Caption1 className={styles.hint}>
        Directory (Azure AD) extensions are defined as <code>extensionProperty</code>{' '}
        on the owning app registration. Use <strong>New extension property</strong>{' '}
        to add one to any app (including apps with none yet).
      </Caption1>

      <div className={styles.filters}>
        <Input
          ref={searchInputRef as unknown as React.Ref<HTMLInputElement>}
          placeholder="Filter by app name, app id, extension name, type, or target — press / to focus"
          contentBefore={<Search24Regular />}
          value={search}
          onChange={(_, d) => setSearch(d.value)}
          style={{ minWidth: 460 }}
        />
        {data && (
          <Caption1 style={{ marginLeft: 'auto' }}>
            {totalApps} app{totalApps === 1 ? '' : 's'} · {totalExts} extension
            {totalExts === 1 ? '' : 's'}
          </Caption1>
        )}
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner label="Loading directory extensions…" />
        </div>
      ) : error ? (
        <EmptyState
          icon={<ExtendedDock24Regular />}
          title="Couldn't load directory extensions"
          description={(error as Error).message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ExtendedDock24Regular />}
          title={
            search
              ? 'No matches for the current filter'
              : 'No directory extensions found'
          }
          description={
            search
              ? 'Clear the filter to see all apps with extensions.'
              : 'No app registration in this tenant exposes an extensionProperty yet.'
          }
          action={
            isEdit && !search ? (
              <Button
                appearance="primary"
                icon={<Add24Regular />}
                onClick={() => setAdding({})}
              >
                New extension property
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Accordion multiple collapsible defaultOpenItems={defaultOpen}>
          {filtered.map((g) => (
            <div key={g.app.id} className={styles.group}>
              <AccordionItem value={g.app.id}>
                <AccordionHeader expandIconPosition="end">
                  <div className={styles.appHeaderRow}>
                    <div className={styles.appTitle}>
                      <span className={styles.appName}>{g.app.displayName}</span>
                      <span className={styles.appId}>{g.app.appId}</span>
                    </div>
                    <Badge
                      appearance="tint"
                      color="brand"
                      className={styles.count}
                    >
                      {g.extensions.length}
                    </Badge>
                  </div>
                </AccordionHeader>
                <AccordionPanel className={styles.panel}>
                  <AppExtensionSection
                    app={g.app}
                    extensions={g.extensions}
                    isEdit={isEdit}
                    onAdd={() => setAdding({ app: g.app })}
                    onDelete={(ext) => setDeleting({ app: g.app, ext })}
                    onUsage={(ext) => setUsageOf(ext)}
                    onAudit={(ext) => setAuditOf(ext)}
                    onManifest={(ext) => setManifestOf(ext)}
                    onValidate={(ext) => setValidateOf(ext)}
                  />
                </AccordionPanel>
              </AccordionItem>
            </div>
          ))}
        </Accordion>
      )}

      {adding && (
        <DirectoryExtensionEditor
          appObjectId={adding.app?.id}
          appDisplayName={adding.app?.displayName}
          open={!!adding}
          onOpenChange={(o) => !o && setAdding(null)}
        />
      )}

      {deleting && (
        <DeleteExtensionDialog
          appObjectId={deleting.app.id}
          ext={deleting.ext}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            toast.success('Extension property deleted', deleting.ext.name);
            setDeleting(null);
          }}
          onError={(e) => toast.error('Delete failed', e)}
        />
      )}

      <ExtensionInfoDialog
        open={infoOpen}
        variant="directory"
        onOpenChange={setInfoOpen}
      />

      <UsageDialog
        open={!!usageOf}
        variant="directory"
        ext={usageOf}
        onOpenChange={(o) => !o && setUsageOf(null)}
      />

      <AuditLogDialog
        open={!!auditOf}
        extensionId={auditOf?.id ?? null}
        label={auditOf?.name ?? null}
        onOpenChange={(o) => !o && setAuditOf(null)}
      />

      {manifestOf && (
        <ManifestSnippetDialog
          open={!!manifestOf}
          variant="directory"
          ext={manifestOf}
          onOpenChange={(o) => !o && setManifestOf(null)}
        />
      )}

      {validateOf && (
        <ValidateValueDialog
          open={!!validateOf}
          attribute={validateOf.name}
          targetTypes={validateOf.targetObjects}
          isSchema={false}
          onOpenChange={(o) => !o && setValidateOf(null)}
        />
      )}

      <DirectoryImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        existingApps={data ?? []}
      />
    </>
  );
}

// ---------- Per-app section with selection + bulk delete ----------

interface SectionProps {
  app: AppRegistration;
  extensions: DirectoryExtensionProperty[];
  isEdit: boolean;
  onAdd: () => void;
  onDelete: (ext: DirectoryExtensionProperty) => void;
  onUsage: (ext: DirectoryExtensionProperty) => void;
  onAudit: (ext: DirectoryExtensionProperty) => void;
  onManifest: (ext: DirectoryExtensionProperty) => void;
  onValidate: (ext: DirectoryExtensionProperty) => void;
}

function AppExtensionSection({
  app,
  extensions,
  isEdit,
  onAdd,
  onDelete,
  onUsage,
  onAudit,
  onManifest,
  onValidate,
}: SectionProps) {
  const styles = useStyles();
  const toast = useAppToast();
  const del = useDeleteExtensionProperty(app.id);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);

  const columns = useMemo<TableColumnDefinition<DirectoryExtensionProperty>[]>(
    () => [
      createTableColumn<DirectoryExtensionProperty>({
        columnId: 'name',
        compare: (a, b) => a.name.localeCompare(b.name),
        renderHeaderCell: () => 'Fully-qualified name',
        renderCell: (e) => (
          <TableCellLayout truncate>
            <code>{e.name}</code>
          </TableCellLayout>
        ),
      }),
      createTableColumn<DirectoryExtensionProperty>({
        columnId: 'dataType',
        compare: (a, b) => a.dataType.localeCompare(b.dataType),
        renderHeaderCell: () => 'Type',
        renderCell: (e) => <TableCellLayout truncate>{e.dataType}</TableCellLayout>,
      }),
      createTableColumn<DirectoryExtensionProperty>({
        columnId: 'targetObjects',
        renderHeaderCell: () => 'Targets',
        renderCell: (e) => (
          <TableCellLayout truncate>{e.targetObjects.join(', ')}</TableCellLayout>
        ),
      }),
      createTableColumn<DirectoryExtensionProperty>({
        columnId: 'source',
        renderHeaderCell: () => 'Source',
        renderCell: (e) =>
          e.isSyncedFromOnPremises ? (
            <Badge appearance="tint" color="informative">
              Synced from on-prem
            </Badge>
          ) : (
            <Badge appearance="tint" color="brand">
              Cloud
            </Badge>
          ),
      }),
      createTableColumn<DirectoryExtensionProperty>({
        columnId: 'actions',
        renderHeaderCell: () => '',
        renderCell: (e) => (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button
                appearance="subtle"
                icon={<MoreHorizontal24Regular />}
                aria-label={`Actions for ${e.name}`}
              />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem
                  icon={<DataPie24Regular />}
                  onClick={() => onUsage(e)}
                >
                  Show usage
                </MenuItem>
                <MenuItem
                  icon={<History24Regular />}
                  onClick={() => onAudit(e)}
                >
                  Show audit history
                </MenuItem>
                <MenuItem
                  icon={<ClipboardCode24Regular />}
                  onClick={() => onManifest(e)}
                >
                  Copy manifest snippet
                </MenuItem>
                {isEdit && (
                  <MenuItem
                    icon={<PlayCircle24Regular />}
                    onClick={() => onValidate(e)}
                  >
                    Validate value (dry-run)
                  </MenuItem>
                )}
                {isEdit && <MenuDivider />}
                {isEdit && (
                  <MenuItem
                    icon={<Delete24Regular />}
                    disabled={e.isSyncedFromOnPremises}
                    onClick={() => onDelete(e)}
                  >
                    Delete
                  </MenuItem>
                )}
              </MenuList>
            </MenuPopover>
          </Menu>
        ),
      }),
    ],
    [isEdit, onAudit, onDelete, onManifest, onUsage, onValidate],
  );

  const columnSizingOptions = useMemo<TableColumnSizingOptions>(
    () => ({
      name: { defaultWidth: 360, minWidth: 200, idealWidth: 380 },
      dataType: { defaultWidth: 120, minWidth: 90 },
      targetObjects: { defaultWidth: 220, minWidth: 120 },
      source: { defaultWidth: 160, minWidth: 120 },
      actions: { defaultWidth: 56, minWidth: 56, idealWidth: 56 },
    }),
    [],
  );

  return (
    <>
      {(isEdit || selected.size > 0) && (
        <div className={styles.panelActions}>
          {isEdit && selected.size > 0 ? (
            <Button
              size="small"
              appearance="primary"
              icon={<Delete24Regular />}
              onClick={() => setBulkOpen(true)}
            >
              Delete {selected.size} selected
            </Button>
          ) : (
            <span />
          )}
          {isEdit && (
            <Button
              appearance="primary"
              icon={<Add24Regular />}
              size="small"
              onClick={onAdd}
            >
              New extension property
            </Button>
          )}
        </div>
      )}

      {extensions.length === 0 ? (
        <Body1>No extension properties match the current filter.</Body1>
      ) : (
        <DataGrid
          items={extensions}
          columns={columns}
          sortable
          resizableColumns
          columnSizingOptions={columnSizingOptions}
          getRowId={(e) => e.id}
          size="small"
          focusMode="composite"
          selectionMode={isEdit ? 'multiselect' : undefined}
          selectedItems={selected}
          onSelectionChange={(_, d) =>
            setSelected(d.selectedItems as Set<string>)
          }
        >
          <DataGridHeader>
            <DataGridRow
              selectionCell={isEdit ? { 'aria-label': 'Select all' } : undefined}
            >
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<DirectoryExtensionProperty>>
            {({ item, rowId }) => (
              <DataGridRow<DirectoryExtensionProperty>
                key={rowId}
                selectionCell={
                  isEdit ? { 'aria-label': `Select ${item.name}` } : undefined
                }
              >
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}

      <ConfirmDialog
        open={bulkOpen}
        onOpenChange={(o) => !o && setBulkOpen(false)}
        title={`Delete ${selected.size} extension propert${selected.size === 1 ? 'y' : 'ies'}`}
        body={
          <>
            This will permanently delete <strong>{selected.size}</strong>{' '}
            extension property record{selected.size === 1 ? '' : 's'} on{' '}
            <strong>{app.displayName}</strong>. Any values stored on resources
            for these extensions will also be lost. This cannot be undone.
          </>
        }
        destructive
        requireTypedValue="delete"
        confirmLabel="Delete all"
        busy={bulkRunning}
        onConfirm={async () => {
          setBulkRunning(true);
          let ok = 0;
          let failed = 0;
          for (const id of Array.from(selected)) {
            try {
              await del.mutateAsync(id);
              ok++;
            } catch {
              failed++;
            }
          }
          setBulkRunning(false);
          setBulkOpen(false);
          setSelected(new Set());
          if (failed === 0) toast.success(`Deleted ${ok} extension properties`);
          else
            toast.error(
              `Deleted ${ok}, failed ${failed}`,
              new Error('Bulk delete partial failure'),
            );
        }}
      />
    </>
  );
}

interface DeleteProps {
  appObjectId: string;
  ext: DirectoryExtensionProperty;
  onClose: () => void;
  onDeleted: () => void;
  onError: (e: unknown) => void;
}

function DeleteExtensionDialog({
  appObjectId,
  ext,
  onClose,
  onDeleted,
  onError,
}: DeleteProps) {
  const del = useDeleteExtensionProperty(appObjectId);
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Delete extension property"
      body={
        <>
          Deleting <strong>{ext.name}</strong> will remove the definition and any
          values stored on resources. This cannot be undone.
        </>
      }
      requireTypedValue={ext.name}
      destructive
      confirmLabel="Delete"
      busy={del.isPending}
      onConfirm={() =>
        del.mutate(ext.id, {
          onSuccess: () => onDeleted(),
          onError: (e) => onError(e),
        })
      }
    />
  );
}

// ---------- Import dialog (multi-app) ----------

interface DirectoryImportRow {
  appObjectId: string;
  appDisplayName?: string;
  name: string;
  dataType: string;
  targetObjects: string[];
}

interface DirectoryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingApps: { app: AppRegistration; extensions: DirectoryExtensionProperty[] }[];
}

function DirectoryImportDialog({
  open,
  onOpenChange,
  existingApps,
}: DirectoryImportDialogProps) {
  const toast = useAppToast();
  const importMut = useImportExtensionProperty();

  const existingMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const g of existingApps) {
      m.set(g.app.id, new Set(g.extensions.map((e) => e.name)));
    }
    return m;
  }, [existingApps]);

  return (
    <ImportDialog<DirectoryImportRow>
      open={open}
      onOpenChange={onOpenChange}
      title="Import directory extensions"
      itemLabel="extension properties"
      parseRow={(raw) => {
        if (typeof raw !== 'object' || raw === null)
          return { error: 'Not an object' };
        const obj = raw as Record<string, unknown>;
        const appObjectId = obj.appObjectId as string;
        const name = obj.name as string;
        const dataType = obj.dataType as string;
        const targetObjects = obj.targetObjects as string[];
        if (!appObjectId || !name || !dataType || !Array.isArray(targetObjects)) {
          return {
            error:
              'Missing appObjectId, name, dataType, or targetObjects (expected the CSV/flat-JSON export shape)',
          };
        }
        return {
          key: `${appObjectId}::${name}`,
          payload: {
            appObjectId,
            appDisplayName: obj.appDisplayName as string | undefined,
            name,
            dataType,
            targetObjects,
          },
        };
      }}
      exists={(key) => {
        const [appObjectId, name] = key.split('::');
        return existingMap.get(appObjectId)?.has(name) ?? false;
      }}
      apply={async (row) => {
        try {
          await importMut.mutateAsync({
            appObjectId: row.appObjectId,
            payload: {
              name: row.name,
              dataType: row.dataType as DirectoryExtensionForm['dataType'],
              targetObjects: row.targetObjects,
            },
          });
        } catch (e) {
          toast.error(`Import failed for ${row.name}`, e);
          throw e;
        }
      }}
    />
  );
}
