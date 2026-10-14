import { Button, Field, Input, Select, Tooltip, makeStyles } from '@fluentui/react-components';
import { Add20Regular, Delete20Regular, Filter20Regular } from '@fluentui/react-icons';
import {
  FILTER_PROPERTIES,
  operatorsFor,
  propertyDefinition,
  type AssignmentFilter,
  type FilterOperator,
} from '@/api/assignmentFilters';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'end' },
  field: { flex: '1 1 150px', minWidth: 0 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
});

interface Props {
  targetTypes: string[];
  filters: AssignmentFilter[];
  onChange: (filters: AssignmentFilter[]) => void;
  onApply: () => void;
  onClear: () => void;
  disabled: boolean;
}

export function AssignmentFilterBuilder({
  targetTypes,
  filters,
  onChange,
  onApply,
  onClear,
  disabled,
}: Props) {
  const styles = useStyles();
  const properties = FILTER_PROPERTIES.filter((property) =>
    property.types.some((type) => targetTypes.includes(type)),
  );
  const change = (index: number, filter: AssignmentFilter) =>
    onChange(filters.map((entry, position) => (position === index ? filter : entry)));
  return (
    <div className={styles.root} data-tour="assignment-filters">
      {filters.map((filter, index) => {
        const property = propertyDefinition(filter.property);
        const noValue = ['empty', 'notEmpty'].includes(filter.operator);
        return (
          <div className={styles.row} key={index}>
            <Field label={`Property ${index + 1}`} className={styles.field}>
              <Select
                value={filter.property}
                disabled={disabled}
                onChange={(_, data) =>
                  change(index, { property: data.value, operator: 'eq', value: '' })
                }
              >
                {[
                  ...new Map([...properties, property].map((entry) => [entry.key, entry])).values(),
                ].map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`Operator ${index + 1}`} className={styles.field}>
              <Select
                value={filter.operator}
                disabled={disabled}
                onChange={(_, data) =>
                  change(index, { ...filter, operator: data.value as FilterOperator })
                }
              >
                {operatorsFor(property).map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </Select>
            </Field>
            {!noValue && (
              <Field label={`Filter value ${index + 1}`} className={styles.field}>
                {property.kind === 'boolean' ? (
                  <Select
                    value={filter.value}
                    disabled={disabled}
                    onChange={(_, data) => change(index, { ...filter, value: data.value })}
                  >
                    <option value="">Select value</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </Select>
                ) : (
                  <Input
                    value={filter.value}
                    disabled={disabled}
                    placeholder={property.kind === 'membership' ? 'Object GUID' : undefined}
                    onChange={(_, data) => change(index, { ...filter, value: data.value })}
                  />
                )}
              </Field>
            )}
            <Tooltip content={`Remove filter ${index + 1}`} relationship="label">
              <Button
                icon={<Delete20Regular />}
                aria-label={`Remove filter ${index + 1}`}
                disabled={disabled}
                onClick={() => onChange(filters.filter((_, position) => position !== index))}
              />
            </Tooltip>
          </div>
        );
      })}
      <div className={styles.actions}>
        <Button
          icon={<Add20Regular />}
          disabled={disabled || !properties.length}
          onClick={() =>
            onChange([...filters, { property: 'displayName', operator: 'eq', value: '' }])
          }
        >
          Add filter
        </Button>
        <Button icon={<Filter20Regular />} disabled={disabled} onClick={onApply}>
          Apply filters
        </Button>
        <Button disabled={disabled || !filters.length} onClick={onClear}>
          Clear filters
        </Button>
      </div>
    </div>
  );
}
