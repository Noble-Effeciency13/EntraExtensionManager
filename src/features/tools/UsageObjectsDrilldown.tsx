import { useMemo, useState } from 'react';
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Dropdown,
  Option,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Tag,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowClockwise16Regular,
  ArrowDownload16Regular,
  Eye16Regular,
  EyeOff16Regular,
  Warning16Regular,
} from '@fluentui/react-icons';
import type { OverviewExtension } from '@/components/ExtensionsOverview';
import {
  probeableTargets,
  useExtensionObjects,
  useMultiTargetObjects,
  type ExtensionObjectRowWithTarget,
  type ObjectsInput,
} from '@/api/usageObjects';
import type { ExtensionObjectRow } from '@/types/extensions';
import { downloadCsv, downloadJson, timestampSuffix } from '@/utils/exportImport';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    flexWrap: 'wrap',
  },
  targetField: { display: 'flex', flexDirection: 'column', gap: '2px' },
  spacer: { flex: '1 1 auto' },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: tokens.colorNeutralForeground3,
  },
  tableWrap: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: 'hidden',
  },
  valueCell: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  monoId: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    overflowWrap: 'anywhere',
  },
  masked: { letterSpacing: '2px' },
  loadMore: {
    display: 'flex',
    justifyContent: 'center',
    padding: '10px',
  },
  warn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: tokens.colorPaletteDarkOrangeForeground1,
  },
  note: { color: tokens.colorNeutralForeground3 },
});

function toInput(source: OverviewExtension, target: string): ObjectsInput {
  return source.kind === 'schema'
    ? { variant: 'schema', ext: source.ext, target }
    : { variant: 'directory', ext: source.ext, target };
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function flattenForExport(rows: ExtensionObjectRow[]): Record<string, unknown>[] {
  return rows.map((r) => {
    const flat: Record<string, unknown> = {
      object: r.displayName,
      identifier: r.identifier ?? '',
      id: r.id,
    };
    for (const [k, val] of Object.entries(r.values)) {
      flat[k] = formatValue(val);
    }
    return flat;
  });
}

/**
 * In-row drill-down for the Usage monitor. Lists the actual directory objects
 * that hold a non-null value for an extension on a chosen target collection,
 * along with the stored values. Lazy: nothing is fetched until rendered (i.e.
 * the row is expanded) and paging is on demand.
 */
export function UsageObjectsDrilldown({ source }: { source: OverviewExtension }) {
  const styles = useStyles();

  const variant = source.kind;
  const targets = useMemo(
    () => probeableTargets(variant, source.ext),
    [variant, source.ext],
  );
  const [target, setTarget] = useState<string>(
    targets.length > 1 ? '__all__' : (targets[0] ?? ''),
  );
  const [reveal, setReveal] = useState(false);

  const isAll = target === '__all__';
  // canProbe only depends on the extension variant, not the specific target.
  const probeOk = source.kind === 'schema' ? source.ext.properties.length > 0 : true;

  // Single-target query — disabled in "All" mode.
  const singleInput = toInput(source, isAll ? (targets[0] ?? '') : target);
  const q = useExtensionObjects(singleInput, !isAll && !!target && probeOk);

  // Multi-target query — disabled in single-target mode.
  const allInputs = useMemo(
    () => targets.map((t) => toInput(source, t)),
    [targets, source],
  );
  const multiQ = useMultiTargetObjects(allInputs, isAll && probeOk);

  // Unified derived values for the current mode.
  const rows: (ExtensionObjectRow | ExtensionObjectRowWithTarget)[] = useMemo(
    () => isAll ? multiQ.rows : (q.data?.pages.flatMap((p) => p.rows) ?? []),
    [isAll, multiQ.rows, q.data],
  );
  const total = isAll ? undefined : q.data?.pages[0]?.totalCount;
  const isLoading = isAll ? multiQ.isLoading : q.isLoading;
  const isFetching = isAll ? multiQ.isFetching : (q.isFetching && !q.isFetchingNextPage);
  const loadingError: Error | null = isAll
    ? (multiQ.errors[0] ?? null)
    : ((q.error as Error | null) ?? null);
  const hasNextPage = isAll ? false : (q.hasNextPage ?? false);

  const valueColumns = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => Object.keys(r.values).forEach((k) => set.add(k)));
    return Array.from(set);
  }, [rows]);

  if (targets.length === 0) {
    return (
      <Caption1 className={styles.note}>
        No drill-down available — none of this extension's target types
        ({(variant === 'schema'
          ? source.ext.targetTypes
          : source.ext.targetObjects
        ).join(', ') || 'none'}) support object listing.
      </Caption1>
    );
  }

  if (!probeOk) {
    return (
      <Caption1 className={styles.note}>
        This schema extension has no properties defined, so there is nothing to
        probe.
      </Caption1>
    );
  }

  const exportName = (variant === 'schema' ? source.ext.id : source.ext.name)
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .slice(0, 60);

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.targetField}>
          <Caption1>Target type</Caption1>
          <Dropdown
            size="small"
            value={isAll ? 'All target types' : target}
            selectedOptions={[target]}
            onOptionSelect={(_, d) => setTarget(d.optionValue ?? target)}
            style={{ minWidth: '160px' }}
          >
            {targets.length > 1 && (
              <Option key="__all__" value="__all__">
                All target types
              </Option>
            )}
            {targets.map((t) => (
              <Option key={t} value={t}>
                {t}
              </Option>
            ))}
          </Dropdown>
        </div>

        <Tooltip content="Refresh this list" relationship="label">
          <Button
            size="small"
            appearance="subtle"
            icon={<ArrowClockwise16Regular />}
            onClick={() => isAll ? multiQ.refetchAll() : q.refetch()}
            disabled={isFetching}
            aria-label="Refresh object list"
          />
        </Tooltip>

        <Switch
          checked={reveal}
          onChange={(_, d) => setReveal(d.checked)}
          label={reveal ? 'Values shown' : 'Values masked'}
          labelPosition="after"
        />

        <div className={styles.spacer} />

        <div className={styles.meta}>
          {isFetching ? (
            <Spinner size="tiny" label="Loading…" />
          ) : (
            <Caption1>
              {rows.length}
              {!isAll && typeof total === 'number' ? ` of ${total}` : ''} object
              {rows.length === 1 ? '' : 's'}
              {isAll && multiQ.isCapped ? ' (capped at 200 per target type)' : ''}
            </Caption1>
          )}
          <Tooltip content="Export loaded rows as CSV" relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<ArrowDownload16Regular />}
              disabled={rows.length === 0}
              onClick={() =>
                downloadCsv(
                  `usage-${exportName}-${isAll ? 'all' : target}-${timestampSuffix()}.csv`,
                  flattenForExport(rows),
                )
              }
            >
              CSV
            </Button>
          </Tooltip>
          <Tooltip content="Export loaded rows as JSON" relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<ArrowDownload16Regular />}
              disabled={rows.length === 0}
              onClick={() =>
                downloadJson(
                  `usage-${exportName}-${isAll ? 'all' : target}-${timestampSuffix()}.json`,
                  rows,
                )
              }
            >
              JSON
            </Button>
          </Tooltip>
        </div>
      </div>

      {reveal && rows.length > 0 && (
        <Caption1 className={styles.warn}>
          <Warning16Regular />
          Values may contain personal data. Avoid exporting or sharing
          unnecessarily.
        </Caption1>
      )}

      {loadingError ? (
        <Caption1 style={{ color: 'tomato' }}>
          Couldn’t load objects: {loadingError.message}
        </Caption1>
      ) : isLoading ? (
        <Spinner size="small" label="Listing objects…" />
      ) : rows.length === 0 ? (
        <Caption1 className={styles.note}>
          No {isAll ? '' : `${target} `}objects currently hold a value for this extension.
        </Caption1>
      ) : (
        <div className={styles.tableWrap}>
          <Table size="small" aria-label={`Objects using ${exportName} on ${isAll ? 'all target types' : target}`}>
            <TableHeader>
              <TableRow>
                {isAll && <TableHeaderCell style={{ width: 120 }}>Target</TableHeaderCell>}
                <TableHeaderCell>Object</TableHeaderCell>
                <TableHeaderCell>Identifier</TableHeaderCell>
                {valueColumns.map((c) => (
                  <TableHeaderCell key={c}>{c}</TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const rowTarget = isAll
                  ? (r as ExtensionObjectRowWithTarget).target
                  : target;
                return (
                  <TableRow key={`${rowTarget}:${r.id}`}>
                    {isAll && (
                      <TableCell>
                        <Badge appearance="tint" color="informative">
                          {rowTarget}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <Body1>{r.displayName}</Body1>
                      <div className={styles.monoId}>{r.id}</div>
                    </TableCell>
                    <TableCell>
                      <span className={styles.monoId}>{r.identifier ?? '—'}</span>
                    </TableCell>
                    {valueColumns.map((c) => {
                      const raw = r.values[c];
                      const text = formatValue(raw);
                      const isEmpty = text === '—';
                      return (
                        <TableCell key={c}>
                          {isEmpty ? (
                            '—'
                          ) : reveal ? (
                            <Tag appearance="outline" size="small">
                              {text}
                            </Tag>
                          ) : (
                            <span className={styles.masked}>••••••</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {hasNextPage && (
            <div className={styles.loadMore}>
              <Button
                size="small"
                appearance="subtle"
                icon={reveal ? <Eye16Regular /> : <EyeOff16Regular />}
                onClick={() => q.fetchNextPage()}
                disabled={q.isFetchingNextPage}
              >
                {q.isFetchingNextPage ? (
                  <Spinner size="tiny" label="Loading…" />
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}
          {isAll && multiQ.isCapped && (
            <div className={styles.loadMore}>
              <Caption1 className={styles.note}>
                Showing up to 200 objects per target type. Switch to a single target for full pagination.
              </Caption1>
            </div>
          )}
        </div>
      )}

      {!isAll && typeof total === 'number' && total > rows.length && !q.hasNextPage && (
        <Caption1 className={styles.note}>
          <Badge appearance="tint" color="informative">
            Showing first {rows.length}
          </Badge>
        </Caption1>
      )}
    </div>
  );
}
