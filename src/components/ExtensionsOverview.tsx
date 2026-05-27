import { ReactNode, useMemo, useState } from 'react';
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Dropdown,
  Field,
  Input,
  Option,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Tag,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ChevronDown16Regular,
  ChevronRight16Regular,
  Search16Regular,
} from '@fluentui/react-icons';
import { useSchemaExtensions } from '@/api/schemaExtensions';
import { useAllDirectoryExtensions } from '@/api/directoryExtensions';
import type {
  DirectoryExtensionProperty,
  SchemaExtension,
  SchemaExtensionStatus,
} from '@/types/extensions';

export type OverviewExtension =
  | { kind: 'schema'; ext: SchemaExtension }
  | {
      kind: 'directory';
      ext: DirectoryExtensionProperty;
      appDisplayName: string;
    };

interface OverviewRow {
  key: string;
  kind: 'schema' | 'directory';
  name: string;
  targets: string[];
  ownerOrApp: string;
  status?: string;
  source: OverviewExtension;
}

const useStyles = makeStyles({
  toolbar: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    marginBottom: '12px',
  },
  search: { minWidth: '260px', flex: '1 1 260px', maxWidth: '420px' },
  pillRow: { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  counts: {
    color: tokens.colorNeutralForeground3,
    marginLeft: 'auto',
    alignSelf: 'center',
  },
  expandCell: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  expandBody: {
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  monoId: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    overflowWrap: 'anywhere',
  },
  actionsCell: {
    whiteSpace: 'nowrap',
    textAlign: 'right',
  },
  chevronBtn: {
    minWidth: 'auto',
  },
  empty: {
    padding: '20px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

interface Props {
  /** Optional title displayed above the toolbar. */
  description?: string;
  /** Render per-row actions (buttons that open dialogs etc.). */
  renderActions: (row: OverviewExtension) => ReactNode;
  /** Restrict to one kind. */
  kindFilter?: 'schema' | 'directory';
}

/**
 * Reusable dashboard table for the global Tools pages. Lists every schema
 * and directory extension in the tenant with filters, sortable name column,
 * and expandable rows that surface properties / owner / target details.
 */
export function ExtensionsOverview({
  description,
  renderActions,
  kindFilter,
}: Props) {
  const styles = useStyles();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'schema' | 'directory'>(
    kindFilter ?? 'all',
  );
  const [target, setTarget] = useState<string>('');
  const [schemaStatus, setSchemaStatus] = useState<
    SchemaExtensionStatus | 'All'
  >('InDevelopment');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortAsc, setSortAsc] = useState(true);

  // Schema list is global across tenants when Available, so server-side filter
  // by status to keep the dashboard scoped to your tenant's own work by default.
  const schemaQ = useSchemaExtensions({
    status: schemaStatus === 'All' ? undefined : schemaStatus,
  });
  const dirQ = useAllDirectoryExtensions();

  const rows = useMemo<OverviewRow[]>(() => {
    const out: OverviewRow[] = [];
    if (kindFilter !== 'directory') {
      for (const page of schemaQ.data?.pages ?? []) {
        for (const ext of page.items) {
          out.push({
            key: `schema:${ext.id}`,
            kind: 'schema',
            name: ext.id,
            targets: ext.targetTypes,
            ownerOrApp: ext.owner,
            status: ext.status,
            source: { kind: 'schema', ext },
          });
        }
      }
    }
    if (kindFilter !== 'schema') {
      for (const group of dirQ.data ?? []) {
        for (const ext of group.extensions) {
          out.push({
            key: `directory:${ext.id}`,
            kind: 'directory',
            name: ext.name,
            targets: ext.targetObjects,
            ownerOrApp: group.app.displayName,
            source: {
              kind: 'directory',
              ext,
              appDisplayName: group.app.displayName,
            },
          });
        }
      }
    }
    return out;
  }, [schemaQ.data, dirQ.data, kindFilter]);

  const targets = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.targets.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (kind !== 'all' && r.kind !== kind) return false;
      if (target && !r.targets.includes(target)) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.ownerOrApp.toLowerCase().includes(q) ||
        r.targets.some((t) => t.toLowerCase().includes(q))
      );
    });
    list = list.slice().sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [rows, query, kind, target, sortAsc]);

  const loading = schemaQ.isLoading || dirQ.isLoading;
  const error = schemaQ.error || dirQ.error;

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  const expandAll = () =>
    setExpanded(new Set(filtered.map((r) => r.key)));
  const collapseAll = () => setExpanded(new Set());

  return (
    <div>
      {description && (
        <Body1 style={{ marginBottom: 12 }}>{description}</Body1>
      )}

      <div className={styles.toolbar}>
        <Field label="Search" className={styles.search}>
          <Input
            value={query}
            onChange={(_, d) => setQuery(d.value)}
            contentBefore={<Search16Regular />}
            placeholder="Name, owner app, or target type…"
          />
        </Field>
        {!kindFilter && (
          <Field label="Kind">
            <Dropdown
              value={
                kind === 'all'
                  ? 'All kinds'
                  : kind === 'schema'
                    ? 'Schema'
                    : 'Directory'
              }
              selectedOptions={[kind]}
              onOptionSelect={(_, d) =>
                setKind((d.optionValue as 'all' | 'schema' | 'directory') ?? 'all')
              }
            >
              <Option value="all">All kinds</Option>
              <Option value="schema">Schema</Option>
              <Option value="directory">Directory</Option>
            </Dropdown>
          </Field>
        )}
        {kind !== 'directory' && (
          <Field label="Schema status">
            <Dropdown
              value={
                schemaStatus === 'All'
                  ? 'All statuses'
                  : schemaStatus === 'InDevelopment'
                    ? 'In development'
                    : schemaStatus
              }
              selectedOptions={[schemaStatus]}
              onOptionSelect={(_, d) =>
                setSchemaStatus(
                  (d.optionValue as SchemaExtensionStatus | 'All') ??
                    'InDevelopment',
                )
              }
            >
              <Option value="InDevelopment">In development</Option>
              <Option value="Available">Available</Option>
              <Option value="Deprecated">Deprecated</Option>
              <Option value="All">All statuses</Option>
            </Dropdown>
          </Field>
        )}
        <Field label="Target type">
          <Dropdown
            value={target || 'Any'}
            selectedOptions={[target || '__any']}
            onOptionSelect={(_, d) =>
              setTarget(d.optionValue === '__any' ? '' : (d.optionValue ?? ''))
            }
          >
            <Option value="__any">Any</Option>
            {targets.map((t) => (
              <Option key={t} value={t}>
                {t}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <div className={styles.pillRow}>
          <Button size="small" appearance="subtle" onClick={expandAll}>
            Expand all
          </Button>
          <Button size="small" appearance="subtle" onClick={collapseAll}>
            Collapse all
          </Button>
        </div>
        <Caption1 className={styles.counts}>
          {loading
            ? 'Loading…'
            : `${filtered.length} of ${rows.length} extension${rows.length === 1 ? '' : 's'}`}
        </Caption1>
      </div>

      {error && (
        <Caption1 style={{ color: 'tomato' }}>
          Couldn't load: {(error as Error).message}
        </Caption1>
      )}

      <Table size="small" sortable aria-label="Extensions overview">
        <TableHeader>
          <TableRow>
            <TableHeaderCell style={{ width: 32 }} />
            <TableHeaderCell
              sortDirection={sortAsc ? 'ascending' : 'descending'}
              onClick={() => setSortAsc((v) => !v)}
            >
              Name
            </TableHeaderCell>
            <TableHeaderCell style={{ width: 110 }}>Kind</TableHeaderCell>
            <TableHeaderCell>Target types</TableHeaderCell>
            <TableHeaderCell>Owner / App</TableHeaderCell>
            <TableHeaderCell style={{ width: 110 }}>Status</TableHeaderCell>
            <TableHeaderCell className={styles.actionsCell}>
              Actions
            </TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={7}>
                <Spinner size="tiny" label="Loading extensions…" />
              </TableCell>
            </TableRow>
          )}
          {!loading && filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7}>
                <div className={styles.empty}>No matching extensions.</div>
              </TableCell>
            </TableRow>
          )}
          {filtered.map((r) => {
            const isOpen = expanded.has(r.key);
            return (
              <>
                <TableRow key={r.key}>
                  <TableCell>
                    <Button
                      className={styles.chevronBtn}
                      appearance="subtle"
                      size="small"
                      icon={
                        isOpen ? (
                          <ChevronDown16Regular />
                        ) : (
                          <ChevronRight16Regular />
                        )
                      }
                      aria-label={isOpen ? 'Collapse row' : 'Expand row'}
                      onClick={() => toggle(r.key)}
                    />
                  </TableCell>
                  <TableCell>
                    <span className={styles.monoId}>{r.name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      appearance="tint"
                      color={r.kind === 'schema' ? 'brand' : 'informative'}
                    >
                      {r.kind === 'schema' ? 'Schema' : 'Directory'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className={styles.pillRow}>
                      {r.targets.map((t) => (
                        <Tag key={t} appearance="outline" size="small">
                          {t}
                        </Tag>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{r.ownerOrApp || '—'}</TableCell>
                  <TableCell>
                    {r.status ? (
                      <Badge
                        appearance="tint"
                        color={
                          r.status === 'Available'
                            ? 'success'
                            : r.status === 'Deprecated'
                              ? 'warning'
                              : 'informative'
                        }
                      >
                        {r.status}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className={styles.actionsCell}>
                    {renderActions(r.source)}
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow key={`${r.key}__exp`}>
                    <TableCell colSpan={7} className={styles.expandCell}>
                      <div className={styles.expandBody}>
                        {r.source.kind === 'schema' ? (
                          <>
                            <Caption1>
                              <strong>Properties</strong>
                            </Caption1>
                            <div className={styles.pillRow}>
                              {r.source.ext.properties.map((p) => (
                                <Tag
                                  key={p.name}
                                  appearance="outline"
                                  size="small"
                                >
                                  {p.name}: {p.type}
                                </Tag>
                              ))}
                            </div>
                            {r.source.ext.description && (
                              <Caption1>
                                <strong>Description:</strong>{' '}
                                {r.source.ext.description}
                              </Caption1>
                            )}
                          </>
                        ) : (
                          <>
                            <Caption1>
                              <strong>Data type:</strong>{' '}
                              {r.source.ext.dataType}
                              {r.source.ext.isSyncedFromOnPremises &&
                                ' · synced from on-prem'}
                            </Caption1>
                            <Caption1>
                              <strong>Object id:</strong>{' '}
                              <span className={styles.monoId}>
                                {r.source.ext.id}
                              </span>
                            </Caption1>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
