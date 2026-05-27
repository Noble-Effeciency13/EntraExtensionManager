import { useState } from 'react';
import {
  Body1,
  Button,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Beaker16Regular } from '@fluentui/react-icons';
import {
  ExtensionsOverview,
  OverviewExtension,
} from '@/components/ExtensionsOverview';
import { ValidateValueDialog } from '@/components/ValidateValueDialog';
import {
  ChartCard,
  Donut,
  HorizontalBars,
  StatCard,
} from '@/components/charts';
import { useExtensionsAggregates } from '@/hooks/useExtensionsAggregates';

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: '16px' },
  intro: { color: tokens.colorNeutralForeground2, maxWidth: '720px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
  },
  panel: {
    padding: '16px 20px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
  },
});

export function ValidateValuePage() {
  const styles = useStyles();
  const [target, setTarget] = useState<OverviewExtension | null>(null);
  const agg = useExtensionsAggregates('InDevelopment');

  const attribute = target
    ? target.kind === 'schema'
      ? target.ext.id
      : target.ext.name
    : '';
  const targetTypes = target
    ? target.kind === 'schema'
      ? target.ext.targetTypes
      : target.ext.targetObjects
    : [];
  const isSchema = target?.kind === 'schema';
  const propertyNames =
    target?.kind === 'schema'
      ? target.ext.properties.map((p) => p.name)
      : undefined;

  return (
    <div className={styles.page}>
      <Title2>Validate value (dry-run)</Title2>
      <Body1 className={styles.intro}>
        Write a sample value to a real resource, read it back, then null it
        out — a safe end-to-end test that an extension is reachable and
        accepts the expected data type. Requires Edit mode.
      </Body1>

      <div className={styles.grid}>
        <StatCard
          title="Testable extensions"
          value={agg.loading ? '…' : agg.total}
          hint={`${agg.schemaCount} schema · ${agg.directoryCount} directory`}
        />
        <StatCard
          title="Directory data types"
          value={agg.byDataType.length}
          hint="Primitive types you'll exercise"
        />
        <StatCard
          title="Distinct target types"
          value={agg.byTarget.length}
          hint="Graph collections you'll hit"
        />
      </div>

      <div className={styles.grid}>
        <ChartCard
          title="Directory data types"
          hint="Each requires a different sample value."
        >
          <Donut data={agg.byDataType} />
        </ChartCard>
        <ChartCard
          title="Extensions per target type"
          hint="Pick a target to test against."
        >
          <HorizontalBars data={agg.byTarget} />
        </ChartCard>
      </div>

      <div className={styles.panel}>
        <ExtensionsOverview
          description="Choose an extension to write, read, and null a test value."
          renderActions={(src) => (
            <Button
              size="small"
              icon={<Beaker16Regular />}
              onClick={() => setTarget(src)}
            >
              Dry-run
            </Button>
          )}
        />
      </div>
      {target && (
        <ValidateValueDialog
          open={true}
          onOpenChange={(o) => !o && setTarget(null)}
          attribute={attribute}
          targetTypes={targetTypes}
          isSchema={isSchema}
          propertyNames={propertyNames}
        />
      )}
    </div>
  );
}
