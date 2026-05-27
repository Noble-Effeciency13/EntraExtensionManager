import { useState } from 'react';
import {
  Body1,
  Button,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { History16Regular } from '@fluentui/react-icons';
import {
  ExtensionsOverview,
  OverviewExtension,
} from '@/components/ExtensionsOverview';
import { AuditLogDialog } from '@/components/AuditLogDialog';
import {
  ChartCard,
  Donut,
  HorizontalBars,
  StatCard,
  chartColor,
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

export function AuditLogPage() {
  const styles = useStyles();
  const [target, setTarget] = useState<OverviewExtension | null>(null);
  const agg = useExtensionsAggregates('All', { tenantOnly: true });
  const id = target
    ? target.kind === 'schema'
      ? target.ext.id
      : target.ext.name
    : null;

  return (
    <div className={styles.page}>
      <Title2>Audit log</Title2>
      <Body1 className={styles.intro}>
        Pick any extension to inspect its recent directory audit events —
        creates, updates, status changes and deletions. The charts below
        summarise the extensions <em>owned by an app in this tenant</em>;
        global schemas owned by other tenants are excluded.
      </Body1>

      <div className={styles.grid}>
        <StatCard
          title="Auditable extensions"
          value={agg.loading ? '…' : agg.total}
          hint={`${agg.schemaCount} schema · ${agg.directoryCount} directory`}
        />
        <StatCard
          title="Owner apps"
          value={agg.byOwner.length}
          hint="Each app's changes appear as audit events"
        />
        <StatCard
          title="Schema lifecycle states"
          value={agg.byStatus.length}
          hint="InDevelopment / Available / Deprecated"
        />
      </div>

      <div className={styles.grid}>
        <ChartCard title="By extension kind" hint="Schema vs directory.">
          <Donut
            data={agg.byKind.map((d, i) => ({ ...d, color: chartColor(i) }))}
          />
        </ChartCard>
        <ChartCard
          title="Schema lifecycle mix"
          hint="Status transitions are a common source of audit events."
        >
          <Donut data={agg.byStatus} />
        </ChartCard>
        <ChartCard
          title="Top owner apps"
          hint="Apps responsible for the most extensions."
        >
          <HorizontalBars data={agg.byOwner} maxRows={6} />
        </ChartCard>
      </div>

      <div className={styles.panel}>
        <ExtensionsOverview
          description="Choose an extension to open its directory audit history."
          renderActions={(src) => (
            <Button
              size="small"
              icon={<History16Regular />}
              onClick={() => setTarget(src)}
            >
              View history
            </Button>
          )}
        />
      </div>
      <AuditLogDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        extensionId={id}
        label={id}
      />
    </div>
  );
}
