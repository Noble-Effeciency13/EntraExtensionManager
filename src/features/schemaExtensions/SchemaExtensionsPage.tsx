import { useMemo, useRef, useState } from 'react';
import {
  Button,
  Caption1,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Dropdown,
  Input,
  Menu,
  MenuDivider,
  MenuItem,
  MenuItemCheckbox,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  TableCellLayout,
  TableColumnDefinition,
  TableColumnSizingOptions,
  Title2,
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
  Edit24Regular,
  History24Regular,
  Info24Regular,
  MoreHorizontal24Regular,
  Options24Regular,
  PlayCircle24Regular,
  Search24Regular,
} from '@fluentui/react-icons';
import {
  useDeleteSchemaExtension,
  useSchemaExtensions,
  useSetSchemaExtensionStatus,
  type SchemaExtensionsFilter,
} from '@/api/schemaExtensions';
import type { SchemaExtension, SchemaExtensionStatus } from '@/types/extensions';
import { StatusBadge } from './StatusBadge';
import { SchemaExtensionEditor } from './SchemaExtensionEditor';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ExtensionInfoDialog } from '@/components/ExtensionInfoDialog';
import { UsageDialog } from '@/components/UsageDialog';
import { AuditLogDialog } from '@/components/AuditLogDialog';
import { ManifestSnippetDialog } from '@/components/ManifestSnippetDialog';
import { ValidateValueDialog } from '@/components/ValidateValueDialog';
import { ImportDialog } from '@/components/ImportDialog';
import { useAppToast } from '@/hooks/useAppToast';
import { useMode } from '@/auth/mode';
import { useOwnerTenantIds } from '@/api/owners';
import { useCreateSchemaExtension } from '@/api/schemaExtensions';
import {
  downloadCsv,
  downloadJson,
  timestampSuffix,
} from '@/utils/exportImport';
import { usePageShortcut } from '@/hooks/useKeyboardShortcuts';
import { usePageTour } from '@/components/tour/TourProvider';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  filters: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '12px',
    alignItems: 'center',
  },
  hint: {
    marginBottom: '16px',
  },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    padding: '8px',
    boxShadow: tokens.shadow4,
  },
  loadMore: {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px',
    gap: '12px',
    alignItems: 'center',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    padding: '64px',
  },
});

const statusOptions: SchemaExtensionStatus[] = [
  'InDevelopment',
  'Available',
  'Deprecated',
];

const STATUS_OPTION_LABELS: Record<SchemaExtensionStatus | 'All', string> = {
  All: 'All statuses',
  InDevelopment: 'In development',
  Available: 'Available',
  Deprecated: 'Deprecated',
};

export function SchemaExtensionsPage() {
  const styles = useStyles();
  const toast = useAppToast();
  const { isEdit } = useMode();

  // Default to "InDevelopment" — Graph returns *every* tenant's Available
  // schema extensions globally, which can be tens of thousands of rows.
  const [statusFilter, setStatusFilter] = useState<SchemaExtensionStatus | 'All'>(
    'InDevelopment',
  );
  const [ownerFilter, setOwnerFilter] = useState('');
  const [search, setSearch] = useState('');

  const queryFilter: SchemaExtensionsFilter = useMemo(
    () => ({
      status: statusFilter === 'All' ? undefined : statusFilter,
      ownerAppId: ownerFilter.trim() || undefined,
    }),
    [statusFilter, ownerFilter],
  );

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error,
  } = useSchemaExtensions(queryFilter);

  const del = useDeleteSchemaExtension();
  const setStatus = useSetSchemaExtensionStatus();
  const create = useCreateSchemaExtension();

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SchemaExtension | null>(null);
  const [deleting, setDeleting] = useState<SchemaExtension | null>(null);
  const [promoting, setPromoting] = useState<{
    ext: SchemaExtension;
    next: SchemaExtensionStatus;
  } | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [usageOf, setUsageOf] = useState<SchemaExtension | null>(null);
  const [auditOf, setAuditOf] = useState<SchemaExtension | null>(null);
  const [manifestOf, setManifestOf] = useState<SchemaExtension | null>(null);
  const [validateOf, setValidateOf] = useState<SchemaExtension | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  usePageShortcut('eem:new', () => {
    if (isEdit) {
      setEditing(null);
      setEditorOpen(true);
    }
  });
  usePageShortcut('eem:focus-search', () => searchInputRef.current?.focus());

  usePageTour([
    {
      title: 'Schema extensions',
      body: 'This is the global /schemaExtensions collection. Refresh, export or import definitions here, and create new ones in Edit mode.',
      target: 'schema-actions',
    },
    {
      title: 'Filter & search',
      body: 'Narrow the list by lifecycle status or owner appId, and search the rows already loaded.',
      target: 'schema-filters',
    },
  ]);

  const rows = useMemo(() => {
    const list = data?.pages.flatMap((p) => p.items) ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (e) =>
        e.id.toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q) ||
        e.targetTypes.some((t) => t.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const totalLoaded = data?.pages.reduce((n, p) => n + p.items.length, 0) ?? 0;

  // ---------- Column visibility ----------
  type ColumnId =
    | 'id'
    | 'description'
    | 'targetTypes'
    | 'status'
    | 'owner'
    | 'ownerTenantId'
    | 'propertiesCount'
    | 'propertiesNames'
    | 'actions';

  const ALL_COLUMNS: { id: ColumnId; label: string; defaultVisible: boolean }[] = [
    { id: 'id', label: 'Id', defaultVisible: true },
    { id: 'description', label: 'Description', defaultVisible: true },
    { id: 'targetTypes', label: 'Targets', defaultVisible: true },
    { id: 'status', label: 'Status', defaultVisible: true },
    { id: 'owner', label: 'Owner appId', defaultVisible: true },
    { id: 'ownerTenantId', label: 'Owner tenant id', defaultVisible: false },
    { id: 'propertiesCount', label: 'Properties (count)', defaultVisible: false },
    { id: 'propertiesNames', label: 'Properties (names)', defaultVisible: false },
    { id: 'actions', label: 'Actions', defaultVisible: true },
  ];

  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(
    () => new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)),
  );

  const tenantIdEnabled = visibleColumns.has('ownerTenantId');
  const ownerTenantMap = useOwnerTenantIds(
    rows.map((r) => r.owner),
    tenantIdEnabled,
  );

  const columns: TableColumnDefinition<SchemaExtension>[] = useMemo(
    () => [
      createTableColumn<SchemaExtension>({
        columnId: 'id',
        compare: (a, b) => a.id.localeCompare(b.id),
        renderHeaderCell: () => 'Id',
        renderCell: (item) => (
          <TableCellLayout truncate>
            <code>{item.id}</code>
          </TableCellLayout>
        ),
      }),
      createTableColumn<SchemaExtension>({
        columnId: 'description',
        renderHeaderCell: () => 'Description',
        renderCell: (item) => <TableCellLayout truncate>{item.description}</TableCellLayout>,
      }),
      createTableColumn<SchemaExtension>({
        columnId: 'targetTypes',
        renderHeaderCell: () => 'Targets',
        renderCell: (item) => (
          <TableCellLayout truncate>{item.targetTypes.join(', ')}</TableCellLayout>
        ),
      }),
      createTableColumn<SchemaExtension>({
        columnId: 'status',
        compare: (a, b) => a.status.localeCompare(b.status),
        renderHeaderCell: () => 'Status',
        renderCell: (item) => <StatusBadge status={item.status} />,
      }),
      createTableColumn<SchemaExtension>({
        columnId: 'owner',
        renderHeaderCell: () => 'Owner appId',
        renderCell: (item) => (
          <TableCellLayout truncate>
            <code style={{ fontSize: 12 }}>{item.owner}</code>
          </TableCellLayout>
        ),
      }),
      createTableColumn<SchemaExtension>({
        columnId: 'ownerTenantId',
        renderHeaderCell: () => 'Owner tenant id',
        renderCell: (item) => {
          const entry = ownerTenantMap.get(item.owner);
          if (!entry) return null;
          if (entry.isLoading) {
            return (
              <TableCellLayout>
                <Spinner size="tiny" />
              </TableCellLayout>
            );
          }
          return (
            <TableCellLayout truncate>
              {entry.tenantId ? (
                <code style={{ fontSize: 12 }}>{entry.tenantId}</code>
              ) : (
                <Caption1>Not found</Caption1>
              )}
            </TableCellLayout>
          );
        },
      }),
      createTableColumn<SchemaExtension>({
        columnId: 'propertiesCount',
        compare: (a, b) => a.properties.length - b.properties.length,
        renderHeaderCell: () => 'Properties (count)',
        renderCell: (item) => (
          <TableCellLayout>{item.properties.length}</TableCellLayout>
        ),
      }),
      createTableColumn<SchemaExtension>({
        columnId: 'propertiesNames',
        renderHeaderCell: () => 'Properties (names)',
        renderCell: (item) => (
          <TableCellLayout truncate>
            <code style={{ fontSize: 12 }}>
              {item.properties.map((p) => `${p.name}:${p.type}`).join(', ')}
            </code>
          </TableCellLayout>
        ),
      }),
      createTableColumn<SchemaExtension>({
        columnId: 'actions',
        renderHeaderCell: () => '',
        renderCell: (item) => (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button
                appearance="subtle"
                icon={<MoreHorizontal24Regular />}
                aria-label={`Actions for ${item.id}`}
              />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem
                  icon={<DataPie24Regular />}
                  onClick={() => setUsageOf(item)}
                >
                  Show usage
                </MenuItem>
                <MenuItem
                  icon={<History24Regular />}
                  onClick={() => setAuditOf(item)}
                >
                  Show audit history
                </MenuItem>
                <MenuItem
                  icon={<ClipboardCode24Regular />}
                  onClick={() => setManifestOf(item)}
                >
                  Copy manifest snippet
                </MenuItem>
                {isEdit && (
                  <MenuItem
                    icon={<PlayCircle24Regular />}
                    onClick={() => setValidateOf(item)}
                  >
                    Validate value (dry-run)
                  </MenuItem>
                )}
                {isEdit && <MenuDivider />}
                {isEdit && (
                  <MenuItem
                    icon={<Edit24Regular />}
                    onClick={() => {
                      setEditing(item);
                      setEditorOpen(true);
                    }}
                  >
                    Edit
                  </MenuItem>
                )}
                {isEdit && item.status === 'InDevelopment' && (
                  <MenuItem
                    onClick={() => setPromoting({ ext: item, next: 'Available' })}
                  >
                    Promote to Available
                  </MenuItem>
                )}
                {isEdit && item.status === 'Available' && (
                  <MenuItem
                    onClick={() => setPromoting({ ext: item, next: 'Deprecated' })}
                  >
                    Mark Deprecated
                  </MenuItem>
                )}
                {isEdit && (
                  <MenuItem icon={<Delete24Regular />} onClick={() => setDeleting(item)}>
                    Delete
                  </MenuItem>
                )}
              </MenuList>
            </MenuPopover>
          </Menu>
        ),
      }),
    ],
    [isEdit, ownerTenantMap],
  );

  const displayedColumns = useMemo(
    () => columns.filter((c) => visibleColumns.has(c.columnId as ColumnId)),
    [columns, visibleColumns],
  );

  const columnSizingOptions = useMemo<TableColumnSizingOptions>(
    () => ({
      id: { defaultWidth: 320, minWidth: 160, idealWidth: 320 },
      description: { defaultWidth: 280, minWidth: 120 },
      targetTypes: { defaultWidth: 200, minWidth: 120 },
      status: { defaultWidth: 140, minWidth: 100 },
      owner: { defaultWidth: 280, minWidth: 140 },
      ownerTenantId: { defaultWidth: 280, minWidth: 140 },
      propertiesCount: { defaultWidth: 120, minWidth: 80 },
      propertiesNames: { defaultWidth: 320, minWidth: 160 },
      actions: { defaultWidth: 56, minWidth: 56, idealWidth: 56 },
    }),
    [],
  );

  return (
    <>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Title2>Schema extensions</Title2>
          <Button
            appearance="subtle"
            icon={<Info24Regular />}
            onClick={() => setInfoOpen(true)}
            aria-label="Learn more about schema extensions"
            title="Learn more about schema extensions"
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }} data-tour="schema-actions">
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
                  onClick={() => {
                    const items =
                      selected.size > 0
                        ? rows.filter((r) => selected.has(r.id))
                        : rows;
                    downloadJson(
                      `schemaExtensions-${timestampSuffix()}.json`,
                      items,
                    );
                  }}
                >
                  {selected.size > 0
                    ? `JSON (${selected.size} selected)`
                    : 'JSON (all loaded)'}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    const items =
                      selected.size > 0
                        ? rows.filter((r) => selected.has(r.id))
                        : rows;
                    downloadCsv(
                      `schemaExtensions-${timestampSuffix()}.csv`,
                      items.map((r) => ({
                        id: r.id,
                        description: r.description,
                        status: r.status,
                        owner: r.owner,
                        targetTypes: r.targetTypes,
                        propertyCount: r.properties.length,
                        properties: r.properties
                          .map((p) => `${p.name}:${p.type}`)
                          .join('|'),
                      })),
                    );
                  }}
                >
                  CSV
                </MenuItem>
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
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              New schema extension
            </Button>
          )}
        </div>
      </div>

      <Caption1 className={styles.hint}>
        Tip: <code>/schemaExtensions</code> is a global Graph endpoint — once an
        extension is <em>Available</em>, every tenant sees it. Filter by status or
        owner appId to narrow the list to the definitions you care about.
      </Caption1>

      <div className={styles.filters} data-tour="schema-filters">
        <Input
          ref={searchInputRef as unknown as React.Ref<HTMLInputElement>}
          placeholder="Search loaded rows (id, description, target type) — press / to focus"
          contentBefore={<Search24Regular />}
          value={search}
          onChange={(_, d) => setSearch(d.value)}
          style={{ minWidth: 360 }}
        />
        <Dropdown
          aria-label="Filter by status"
          value={STATUS_OPTION_LABELS[statusFilter]}
          selectedOptions={[statusFilter]}
          onOptionSelect={(_, d) =>
            setStatusFilter((d.optionValue as SchemaExtensionStatus | 'All') ?? 'All')
          }
        >
          <Option value="All">All statuses</Option>
          {statusOptions.map((s) => (
            <Option key={s} value={s}>
              {STATUS_OPTION_LABELS[s]}
            </Option>
          ))}
        </Dropdown>
        <Input
          placeholder="Filter by owner appId (GUID)"
          value={ownerFilter}
          onChange={(_, d) => setOwnerFilter(d.value)}
          style={{ minWidth: 320 }}
        />
        {totalLoaded > 0 && (
          <Caption1 style={{ marginLeft: 'auto' }}>
            Loaded {totalLoaded} row{totalLoaded === 1 ? '' : 's'}
            {hasNextPage ? ' (more available)' : ''}
          </Caption1>
        )}
        <Menu closeOnScroll={false}>
          <MenuTrigger disableButtonEnhancement>
            <Button appearance="subtle" icon={<Options24Regular />}>
              Columns
            </Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList
              checkedValues={{ columns: Array.from(visibleColumns) }}
              onCheckedValueChange={(_, { name, checkedItems }) => {
                if (name === 'columns') {
                  setVisibleColumns(new Set(checkedItems as ColumnId[]));
                }
              }}
            >
              {ALL_COLUMNS.map((c) => (
                <MenuItemCheckbox key={c.id} name="columns" value={c.id}>
                  {c.label}
                </MenuItemCheckbox>
              ))}
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner label="Loading schema extensions…" />
        </div>
      ) : error ? (
        <EmptyState
          icon={<DataPie24Regular />}
          title="Couldn't load schema extensions"
          description={(error as Error).message}
          action={<Button onClick={() => refetch()}>Try again</Button>}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<DataPie24Regular />}
          title="No schema extensions match the current filter"
          description="Adjust the status or owner filter, or create a new schema extension."
          action={
            isEdit ? (
              <Button
                appearance="primary"
                icon={<Add24Regular />}
                onClick={() => {
                  setEditing(null);
                  setEditorOpen(true);
                }}
              >
                New schema extension
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {isEdit && selected.size > 0 && (
            <MessageBar intent="info" style={{ marginBottom: 12 }}>
              <MessageBarBody>
                {selected.size} selected
                <Button
                  size="small"
                  appearance="subtle"
                  style={{ marginLeft: 12 }}
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </Button>
                <Button
                  size="small"
                  appearance="primary"
                  icon={<Delete24Regular />}
                  style={{ marginLeft: 8 }}
                  onClick={() => setBulkDeleteOpen(true)}
                >
                  Delete selected
                </Button>
              </MessageBarBody>
            </MessageBar>
          )}
          <div className={styles.card}>
            <DataGrid
              items={rows}
              columns={displayedColumns}
              sortable
              resizableColumns
              columnSizingOptions={columnSizingOptions}
              getRowId={(item) => item.id}
              focusMode="composite"
              selectionMode={isEdit ? 'multiselect' : undefined}
              selectedItems={selected}
              onSelectionChange={(_, d) =>
                setSelected(d.selectedItems as Set<string>)
              }
            >
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<SchemaExtension>>
                {({ item, rowId }) => (
                  <DataGridRow<SchemaExtension> key={rowId}>
                    {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          </div>
          {hasNextPage && (
            <div className={styles.loadMore}>
              <Button
                appearance="secondary"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
              >
                {isFetchingNextPage ? 'Loading more…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}

      <SchemaExtensionEditor
        open={editorOpen}
        existing={editing}
        onOpenChange={(o) => {
          setEditorOpen(o);
          if (!o) setEditing(null);
        }}
      />

      <ExtensionInfoDialog
        open={infoOpen}
        variant="schema"
        onOpenChange={setInfoOpen}
      />

      <UsageDialog
        open={!!usageOf}
        variant="schema"
        ext={usageOf}
        onOpenChange={(o) => !o && setUsageOf(null)}
      />

      <AuditLogDialog
        open={!!auditOf}
        extensionId={auditOf?.id ?? null}
        label={auditOf?.id ?? null}
        onOpenChange={(o) => !o && setAuditOf(null)}
      />

      {manifestOf && (
        <ManifestSnippetDialog
          open={!!manifestOf}
          variant="schema"
          ext={manifestOf}
          onOpenChange={(o) => !o && setManifestOf(null)}
        />
      )}

      {validateOf && (
        <ValidateValueDialog
          open={!!validateOf}
          attribute={validateOf.id}
          targetTypes={validateOf.targetTypes}
          isSchema
          propertyNames={validateOf.properties.map((p) => p.name)}
          onOpenChange={(o) => !o && setValidateOf(null)}
        />
      )}

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import schema extensions"
        itemLabel="schema extensions"
        parseRow={(raw) => {
          if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
            return { error: 'Not an object' };
          }
          const obj = raw as Record<string, unknown>;
          const id = obj.id;
          if (typeof id !== 'string' || id.length === 0)
            return { error: 'Missing id' };
          if (!Array.isArray(obj.targetTypes))
            return { error: 'Missing targetTypes' };
          if (!Array.isArray(obj.properties))
            return { error: 'Missing properties' };
          return {
            key: id,
            payload: {
              id,
              description: (obj.description as string) ?? '',
              targetTypes: obj.targetTypes as string[],
              properties: obj.properties as { name: string; type: string }[],
              owner: (obj.owner as string) ?? '',
            },
          };
        }}
        exists={(key) => rows.some((r) => r.id === key)}
        apply={async (payload) => {
          await create.mutateAsync(
            payload as Parameters<typeof create.mutateAsync>[0],
          );
        }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(o) => !o && setBulkDeleteOpen(false)}
        title={`Delete ${selected.size} schema extension${selected.size === 1 ? '' : 's'}`}
        body={
          <>
            This will permanently delete <strong>{selected.size}</strong>{' '}
            schema extension definition{selected.size === 1 ? '' : 's'} and any
            values stored on resources. This cannot be undone.
          </>
        }
        destructive
        confirmLabel="Delete all"
        requireTypedValue="delete"
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
          setBulkDeleteOpen(false);
          setSelected(new Set());
          if (failed === 0) toast.success(`Deleted ${ok} schema extensions`);
          else
            toast.error(
              `Deleted ${ok}, failed ${failed}`,
              new Error('Bulk delete partial failure'),
            );
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete schema extension"
        body={
          <>
            Deleting <strong>{deleting?.id}</strong> permanently removes the definition.
            Any values previously stored on resources for this extension may also be
            removed. This cannot be undone.
          </>
        }
        requireTypedValue={deleting?.id}
        destructive
        confirmLabel="Delete"
        busy={del.isPending}
        onConfirm={() => {
          if (!deleting) return;
          del.mutate(deleting.id, {
            onSuccess: () => {
              toast.success('Schema extension deleted', deleting.id);
              setDeleting(null);
            },
            onError: (e) => toast.error('Delete failed', e),
          });
        }}
      />

      <ConfirmDialog
        open={!!promoting}
        onOpenChange={(o) => !o && setPromoting(null)}
        title={
          promoting?.next === 'Available'
            ? 'Promote to Available'
            : 'Mark as Deprecated'
        }
        body={
          promoting?.next === 'Available' ? (
            <>
              Promoting <strong>{promoting?.ext.id}</strong> to <em>Available</em> makes
              it visible to all tenants and locks the schema. You will no longer be able
              to add properties.
            </>
          ) : (
            <>
              Marking <strong>{promoting?.ext.id}</strong> as <em>Deprecated</em> is a
              one-way transition. Existing data is preserved, but new resources cannot
              be created with this extension.
            </>
          )
        }
        confirmLabel="Continue"
        busy={setStatus.isPending}
        onConfirm={() => {
          if (!promoting) return;
          setStatus.mutate(
            { id: promoting.ext.id, status: promoting.next },
            {
              onSuccess: () => {
                toast.success('Status updated', `${promoting.ext.id} → ${promoting.next}`);
                setPromoting(null);
              },
              onError: (e) => toast.error('Status change failed', e),
            },
          );
        }}
      />
    </>
  );
}
