import { Badge } from '@fluentui/react-components';
import type { SchemaExtensionStatus } from '@/types/extensions';

const map: Record<
  SchemaExtensionStatus,
  { color: 'informative' | 'success' | 'warning'; label: string }
> = {
  InDevelopment: { color: 'informative', label: 'In development' },
  Available: { color: 'success', label: 'Available' },
  Deprecated: { color: 'warning', label: 'Deprecated' },
};

export function StatusBadge({ status }: { status: SchemaExtensionStatus }) {
  const m = map[status] ?? { color: 'informative' as const, label: status };
  return (
    <Badge appearance="tint" color={m.color}>
      {m.label}
    </Badge>
  );
}
