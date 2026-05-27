import {
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Tooltip,
  makeStyles,
} from '@fluentui/react-components';
import { ErrorCircle16Regular } from '@fluentui/react-icons';
import {
  useDirectoryExtensionUsage,
  useSchemaExtensionUsage,
} from '@/api/usage';
import type {
  DirectoryExtensionProperty,
  SchemaExtension,
} from '@/types/extensions';

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '460px' },
  error: { display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'tomato' },
});

type Props =
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      variant: 'schema';
      ext: SchemaExtension | null;
    }
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      variant: 'directory';
      ext: DirectoryExtensionProperty | null;
    };

export function UsageDialog(props: Props) {
  const styles = useStyles();
  const schemaQuery = useSchemaExtensionUsage(
    props.variant === 'schema' ? props.ext : null,
    props.open && props.variant === 'schema',
  );
  const dirQuery = useDirectoryExtensionUsage(
    props.variant === 'directory' ? props.ext : null,
    props.open && props.variant === 'directory',
  );
  const q = props.variant === 'schema' ? schemaQuery : dirQuery;

  const label =
    props.variant === 'schema'
      ? props.ext?.id
      : props.ext?.name;

  return (
    <Dialog open={props.open} onOpenChange={(_, d) => props.onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Usage: {label}</DialogTitle>
          <DialogContent className={styles.body}>
            <Caption1>
              Counts of resources where this extension has a non-null value.
              Uses Graph advanced queries ($count + ConsistencyLevel:eventual).
              Results may take a few seconds for large tenants.
            </Caption1>

            {q.isLoading ? (
              <Spinner label="Probing usage…" />
            ) : q.error ? (
              <span className={styles.error}>
                <ErrorCircle16Regular /> {(q.error as Error).message}
              </span>
            ) : q.data && q.data.length > 0 ? (
              <Table size="small">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Target type</TableHeaderCell>
                    <TableHeaderCell>Resources with a value</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {q.data.map((row) => (
                    <TableRow key={row.target}>
                      <TableCell>{row.target}</TableCell>
                      <TableCell>
                        {row.count !== null ? (
                          row.count.toLocaleString()
                        ) : (
                          <Tooltip content={row.error ?? 'Probe failed'} relationship="label">
                            <span className={styles.error}>
                              <ErrorCircle16Regular /> error
                            </span>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Caption1>
                No target types supported for probing on this extension.
              </Caption1>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={() => props.onOpenChange(false)}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
