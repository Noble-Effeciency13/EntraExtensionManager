import {
  Badge,
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
  makeStyles,
} from '@fluentui/react-components';
import { useExtensionAuditLog } from '@/api/auditLogs';

const useStyles = makeStyles({
  surface: {
    maxWidth: 'min(900px, calc(100vw - 48px))',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: 0,
    width: '100%',
  },
  title: {
    overflowWrap: 'anywhere',
    wordBreak: 'break-all',
  },
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extensionId: string | null;
  label: string | null;
}

export function AuditLogDialog({ open, onOpenChange, extensionId, label }: Props) {
  const styles = useStyles();
  const q = useExtensionAuditLog(extensionId, open);

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle className={styles.title}>
            Audit history: {label}
          </DialogTitle>
          <DialogContent className={styles.body}>
            <Caption1>
              Recent <code>/auditLogs/directoryAudits</code> entries that target
              this extension id. Limited to the last 50 events.
            </Caption1>
            {q.isLoading ? (
              <Spinner label="Loading audit entries…" />
            ) : q.error ? (
              <Caption1>Couldn't load audit log: {(q.error as Error).message}</Caption1>
            ) : (q.data ?? []).length === 0 ? (
              <Caption1>No audit log entries found for this extension.</Caption1>
            ) : (
              <Table size="small">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>When</TableHeaderCell>
                    <TableHeaderCell>Activity</TableHeaderCell>
                    <TableHeaderCell>Initiator</TableHeaderCell>
                    <TableHeaderCell>Result</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(q.data ?? []).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        {new Date(e.activityDateTime).toLocaleString()}
                      </TableCell>
                      <TableCell>{e.activityDisplayName}</TableCell>
                      <TableCell>
                        {e.initiatedBy?.user?.displayName ??
                          e.initiatedBy?.user?.userPrincipalName ??
                          '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          appearance="tint"
                          color={
                            e.result === 'success' || e.result === 'Success'
                              ? 'success'
                              : 'danger'
                          }
                        >
                          {e.result}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
