import { MessageBar, MessageBarBody } from '@fluentui/react-components';
import { normalizeGraphError } from '@/graph/errors';

/**
 * Consistent inline error banner for query failures. Renders nothing when
 * `error` is falsy, so it can be dropped into a page unconditionally.
 */
export function ErrorMessageBar({
  error,
  title = 'Something went wrong',
}: {
  error: unknown;
  title?: string;
}) {
  if (!error) return null;
  const normalized = normalizeGraphError(error);
  return (
    <MessageBar intent="error">
      <MessageBarBody>
        <strong>{title}:</strong> {normalized.message}
        {normalized.requestId ? ` (request-id: ${normalized.requestId})` : ''}
      </MessageBarBody>
    </MessageBar>
  );
}
