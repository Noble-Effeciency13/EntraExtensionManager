import { useMemo, useState } from 'react';
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  MessageBar,
  MessageBarBody,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  makeStyles,
} from '@fluentui/react-components';
import { ArrowUpload24Regular } from '@fluentui/react-icons';
import { readFileAsText } from '@/utils/exportImport';
import { useAppToast } from '@/hooks/useAppToast';

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '640px' },
  dropZone: {
    border: '2px dashed var(--colorNeutralStroke2)',
    borderRadius: '8px',
    padding: '24px',
    textAlign: 'center',
    cursor: 'pointer',
  },
});

export type DiffStatus = 'new' | 'exists' | 'invalid';

export interface DiffRow<T> {
  key: string;
  status: DiffStatus;
  reason?: string;
  payload: T;
}

interface Props<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Parse and validate a single object from the file, returning a row or an error. */
  parseRow: (raw: unknown) => { key: string; payload: T } | { error: string };
  /** Decide whether a parsed row already exists in the current dataset. */
  exists: (key: string) => boolean;
  /** Apply a single row. Should resolve on success and reject on failure. */
  apply: (payload: T) => Promise<void>;
  /** Optional label of the data shape, e.g. "schema extensions". */
  itemLabel: string;
}

export function ImportDialog<T>({
  open,
  onOpenChange,
  title,
  parseRow,
  exists,
  apply,
  itemLabel,
}: Props<T>) {
  const styles = useStyles();
  const toast = useAppToast();
  const [diff, setDiff] = useState<DiffRow<T>[] | null>(null);
  const [applying, setApplying] = useState(false);
  const [results, setResults] = useState<{ ok: number; failed: number } | null>(null);

  const stats = useMemo(() => {
    if (!diff) return null;
    return {
      total: diff.length,
      newCount: diff.filter((d) => d.status === 'new').length,
      existsCount: diff.filter((d) => d.status === 'exists').length,
      invalidCount: diff.filter((d) => d.status === 'invalid').length,
    };
  }, [diff]);

  const onFile = async (file: File) => {
    setResults(null);
    try {
      const text = await readFileAsText(file);
      const json = JSON.parse(text);
      const arr = Array.isArray(json) ? json : [json];
      const rows: DiffRow<T>[] = arr.map((raw, i) => {
        const parsed = parseRow(raw);
        if ('error' in parsed) {
          return {
            key: `__invalid_${i}`,
            status: 'invalid',
            reason: parsed.error,
            payload: raw as T,
          };
        }
        return {
          key: parsed.key,
          status: exists(parsed.key) ? 'exists' : 'new',
          payload: parsed.payload,
        };
      });
      setDiff(rows);
    } catch (e) {
      toast.error('Couldn\'t parse file', e);
      setDiff(null);
    }
  };

  const onApply = async () => {
    if (!diff) return;
    setApplying(true);
    let ok = 0;
    let failed = 0;
    for (const row of diff.filter((r) => r.status === 'new')) {
      try {
        await apply(row.payload);
        ok++;
      } catch (e) {
        failed++;
        console.error(`Import failed for ${row.key}`, e);
      }
    }
    setApplying(false);
    setResults({ ok, failed });
    if (failed === 0) toast.success(`Imported ${ok} ${itemLabel}`);
    else toast.error(`Import finished with ${failed} failure(s)`, new Error(`${ok} ok / ${failed} failed`));
  };

  const reset = () => {
    setDiff(null);
    setResults(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(_, d) => {
        if (!d.open) reset();
        onOpenChange(d.open);
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent className={styles.body}>
            {!diff ? (
              <label className={styles.dropZone}>
                <input
                  type="file"
                  accept="application/json,.json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFile(f);
                  }}
                />
                <ArrowUpload24Regular />
                <Body1>Click to choose a .json file</Body1>
                <Caption1>
                  Expected: an array of {itemLabel} (or a single object). The
                  same JSON produced by the Export action is accepted.
                </Caption1>
              </label>
            ) : (
              <>
                <MessageBar intent="info">
                  <MessageBarBody>
                    {stats!.newCount} new · {stats!.existsCount} already exist
                    {stats!.invalidCount > 0 ? ` · ${stats!.invalidCount} invalid` : ''}
                  </MessageBarBody>
                </MessageBar>
                <Table size="small">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Identifier</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Notes</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diff.map((r) => (
                      <TableRow key={r.key}>
                        <TableCell>
                          <code>{r.key.startsWith('__invalid_') ? '—' : r.key}</code>
                        </TableCell>
                        <TableCell>
                          {r.status === 'new' && (
                            <Badge appearance="tint" color="success">
                              Will create
                            </Badge>
                          )}
                          {r.status === 'exists' && (
                            <Badge appearance="tint" color="informative">
                              Skipped (exists)
                            </Badge>
                          )}
                          {r.status === 'invalid' && (
                            <Badge appearance="tint" color="danger">
                              Invalid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Caption1>{r.reason ?? ''}</Caption1>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {results && (
                  <MessageBar intent={results.failed === 0 ? 'success' : 'warning'}>
                    <MessageBarBody>
                      Import completed: {results.ok} succeeded
                      {results.failed > 0 ? `, ${results.failed} failed` : ''}.
                    </MessageBarBody>
                  </MessageBar>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            {diff && !results && (
              <Button appearance="secondary" onClick={reset}>
                Choose another file
              </Button>
            )}
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {diff && stats!.newCount > 0 && !results && (
              <Button
                appearance="primary"
                disabled={applying}
                onClick={onApply}
                icon={applying ? <Spinner size="tiny" /> : undefined}
              >
                {applying ? 'Importing…' : `Import ${stats!.newCount}`}
              </Button>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
