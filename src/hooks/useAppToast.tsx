import { useCallback } from 'react';
import {
  useToastController,
  Toast,
  ToastTitle,
  ToastBody,
} from '@fluentui/react-components';
import { TOASTER_ID } from '@/components/toast';
import { normalizeGraphError } from '@/graph/errors';

export function useAppToast() {
  const { dispatchToast } = useToastController(TOASTER_ID);

  const success = useCallback(
    (title: string, body?: string) => {
      dispatchToast(
        <Toast>
          <ToastTitle>{title}</ToastTitle>
          {body ? <ToastBody>{body}</ToastBody> : null}
        </Toast>,
        { intent: 'success', timeout: 4000 },
      );
    },
    [dispatchToast],
  );

  const error = useCallback(
    (title: string, err: unknown) => {
      const norm = normalizeGraphError(err);
      dispatchToast(
        <Toast>
          <ToastTitle>{title}</ToastTitle>
          <ToastBody subtitle={norm.code}>
            {norm.message}
            {norm.requestId ? ` (request-id: ${norm.requestId})` : ''}
          </ToastBody>
        </Toast>,
        { intent: 'error', timeout: 8000 },
      );
    },
    [dispatchToast],
  );

  return { success, error };
}
