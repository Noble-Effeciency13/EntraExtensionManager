import { useState } from 'react';
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
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Warning16Regular } from '@fluentui/react-icons';
import { useAssignExtensionValue } from '@/api/dryRun';
import { useAppToast } from '@/hooks/useAppToast';
import type { DirectoryExtensionProperty } from '@/types/extensions';

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '480px' },
  readBack: {
    padding: '12px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    maxHeight: '160px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  warn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: tokens.colorPaletteDarkOrangeForeground1,
    fontSize: tokens.fontSizeBase200,
  },
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ext: DirectoryExtensionProperty;
}

export function AssignValueDialog({ open, onOpenChange, ext }: Props) {
  const styles = useStyles();
  const assign = useAssignExtensionValue();
  const toast = useAppToast();

  const [targetType, setTargetType] = useState(ext.targetObjects[0] ?? 'User');
  const [targetId, setTargetId] = useState('');
  const [value, setValue] = useState('');
  const [readBack, setReadBack] = useState<string | null>(null);

  const close = () => {
    onOpenChange(false);
    setTargetId('');
    setValue('');
    setReadBack(null);
  };

  const run = async () => {
    setReadBack(null);
    const trimmedId = targetId.trim();
    const trimmedVal = value.trim();
    if (!trimmedId || !trimmedVal) return;

    // Coerce value to the correct primitive type.
    let coerced: unknown = trimmedVal;
    if (ext.dataType === 'Boolean') {
      coerced = trimmedVal.toLowerCase() === 'true';
    } else if (ext.dataType === 'Integer' || ext.dataType === 'LargeInteger') {
      const n = Number(trimmedVal);
      if (!Number.isFinite(n)) {
        toast.error('Invalid value', new Error(`"${trimmedVal}" is not a valid ${ext.dataType}.`));
        return;
      }
      coerced = n;
    }

    try {
      const res = await assign.mutateAsync({
        targetType,
        targetId: trimmedId,
        attribute: ext.name,
        value: coerced,
      });
      setReadBack(JSON.stringify(res.readBack, null, 2));
      toast.success('Value assigned', `${ext.name} on ${targetType}/${trimmedId}`);
    } catch (e) {
      toast.error('Assign failed', e);
    }
  };

  const shortName = ext.name.split('_').slice(2).join('_') || ext.name;

  return (
    <Dialog open={open} onOpenChange={(_, d) => { if (!d.open) close(); }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            Assign value — <code>{shortName}</code>
          </DialogTitle>
          <DialogContent className={styles.body}>
            <Caption1>
              Writes a value for{' '}
              <code>{ext.name}</code> directly onto the chosen directory
              object. This is a real, persisted write — not a dry-run.
            </Caption1>

            <span className={styles.warn}>
              <Warning16Regular />
              Edit mode required. The value will remain on the object until you
              clear it.
            </span>

            <Field label="Target type">
              <Dropdown
                value={targetType}
                selectedOptions={[targetType]}
                onOptionSelect={(_, d) => setTargetType(d.optionValue ?? targetType)}
              >
                {ext.targetObjects.map((t) => (
                  <Option key={t} value={t}>{t}</Option>
                ))}
              </Dropdown>
            </Field>

            <Field
              label="Object id or UPN"
              hint={
                targetType === 'User'
                  ? 'Object id or userPrincipalName'
                  : 'Object id'
              }
              required
            >
              <Input
                value={targetId}
                onChange={(_, d) => setTargetId(d.value)}
                placeholder={
                  targetType === 'User'
                    ? 'e.g. user@contoso.com or object-guid'
                    : 'e.g. object-guid'
                }
              />
            </Field>

            <Field
              label="Value"
              hint={`Data type: ${ext.dataType}`}
              required
            >
              <Input
                value={value}
                onChange={(_, d) => setValue(d.value)}
                placeholder={
                  ext.dataType === 'Boolean'
                    ? 'true or false'
                    : ext.dataType === 'Integer' || ext.dataType === 'LargeInteger'
                      ? 'e.g. 42'
                      : ext.dataType === 'DateTime'
                        ? 'ISO 8601, e.g. 2026-01-15T00:00:00Z'
                        : 'e.g. myValue'
                }
              />
            </Field>

            {readBack !== null && (
              <>
                <Caption1>Read-back confirmation:</Caption1>
                <div className={styles.readBack}>{readBack}</div>
                <MessageBar intent="success">
                  <MessageBarBody>
                    Value assigned and confirmed on the object.{' '}
                    <Badge appearance="tint" color="warning">
                      Remember to clear it if this was a test.
                    </Badge>
                  </MessageBarBody>
                </MessageBar>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={close} disabled={assign.isPending}>
              Close
            </Button>
            <Button
              appearance="primary"
              onClick={run}
              disabled={
                assign.isPending ||
                !targetId.trim() ||
                !value.trim()
              }
            >
              {assign.isPending ? <Spinner size="tiny" /> : 'Assign'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
