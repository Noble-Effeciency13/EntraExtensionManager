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
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Edit24Regular } from '@fluentui/react-icons';

import type { SchemaExtension } from '@/types/extensions';

import { StatusBadge } from './StatusBadge';

const useStyles = makeStyles({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: '480px',
    maxWidth: '100%',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    columnGap: '16px',
    rowGap: '8px',
    alignItems: 'baseline',
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
  },
  code: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    overflowWrap: 'anywhere',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionTitle: {
    fontWeight: tokens.fontWeightSemibold,
  },
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ext: SchemaExtension | null;
  canEdit: boolean;
  onEdit: () => void;
}

export function SchemaExtensionDetailsDialog({
  open,
  onOpenChange,
  ext,
  canEdit,
  onEdit,
}: Props) {
  const styles = useStyles();
  if (!ext) return null;

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Schema extension</DialogTitle>
          <DialogContent className={styles.body}>
            <div className={styles.grid}>
              <span className={styles.label}>Id</span>
              <code className={styles.code}>{ext.id}</code>

              <span className={styles.label}>Status</span>
              <span>
                <StatusBadge status={ext.status} />
              </span>

              <span className={styles.label}>Description</span>
              <Body1>{ext.description || '—'}</Body1>

              <span className={styles.label}>Target types</span>
              <div className={styles.tags}>
                {ext.targetTypes.length > 0
                  ? ext.targetTypes.map((t) => (
                      <Badge key={t} appearance="tint" color="informative">
                        {t}
                      </Badge>
                    ))
                  : '—'}
              </div>

              <span className={styles.label}>Owner appId</span>
              <code className={styles.code}>{ext.owner || '—'}</code>
            </div>

            <Divider />

            <div className={styles.section}>
              <span className={styles.sectionTitle}>
                Properties ({ext.properties.length})
              </span>
              {ext.properties.length === 0 ? (
                <Caption1>No properties defined.</Caption1>
              ) : (
                <Table size="small" aria-label="Properties">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Type</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ext.properties.map((p) => (
                      <TableRow key={p.name}>
                        <TableCell>
                          <code className={styles.code}>{p.name}</code>
                        </TableCell>
                        <TableCell>{p.type}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {canEdit && (
              <Button
                appearance="primary"
                icon={<Edit24Regular />}
                onClick={onEdit}
              >
                Edit
              </Button>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
