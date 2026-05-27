import { ReactNode, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  Text,
} from '@fluentui/react-components';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  /** If set, requires the user to type this exact string to enable Confirm. */
  requireTypedValue?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel = 'Confirm',
  requireTypedValue,
  destructive,
  busy,
  onConfirm,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const ready = !requireTypedValue || typed === requireTypedValue;

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => {
        onOpenChange(data.open);
        if (!data.open) setTyped('');
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            <Text>{body}</Text>
            {requireTypedValue && (
              <Field
                style={{ marginTop: 16 }}
                label={`Type "${requireTypedValue}" to confirm`}
              >
                <Input
                  value={typed}
                  onChange={(_, data) => setTyped(data.value)}
                  autoFocus
                />
              </Field>
            )}
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" disabled={busy}>
                Cancel
              </Button>
            </DialogTrigger>
            <Button
              appearance={destructive ? 'primary' : 'primary'}
              style={
                destructive
                  ? { backgroundColor: '#c50f1f', borderColor: '#c50f1f' }
                  : undefined
              }
              disabled={!ready || busy}
              onClick={onConfirm}
            >
              {busy ? 'Working…' : confirmLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
