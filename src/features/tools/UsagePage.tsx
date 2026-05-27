import { useEffect, useRef, useState } from 'react';
import {
  Body1,
  Button,
  Caption1,
  ProgressBar,
  Title2,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowClockwise20Regular,
  DataUsage16Regular,
} from '@fluentui/react-icons';
import {
  ExtensionsOverview,
  OverviewExtension,
} from '@/components/ExtensionsOverview';
import { UsageDialog } from '@/components/UsageDialog';
import {
  ChartCard,
  Donut,
  HorizontalBars,
  StatCard,
} from '@/components/charts';
import { useExtensionsAggregates } from '@/hooks/useExtensionsAggregates';
import { useBulkUsageProbe } from '@/api/usage';
import { useAppToast } from '@/hooks/useAppToast';

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: '16px' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  headerMeta: { display: 'flex', alignItems: 'center', gap: '10px' },
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

export function UsagePage() {
  const styles = useStyles();
  const toast = useAppToast();
  const [target, setTarget] = useState<OverviewExtension | null>(null);
  const [lastProbed, setLastProbed] = useState<Date | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const agg = useExtensionsAggregates('InDevelopment');
  const probe = useBulkUsageProbe();

  const runProbe = async (silent = false) => {
    if (probe.isPending || agg.total === 0) return;
    setProgress({ done: 0, total: agg.total });
    try {
      await probe.mutateAsync({
        schemas: agg.schemas,
        directories: agg.directories,
        onEntry: (_entry, done, total) => setProgress({ done, total }),
      });
      setLastProbed(new Date());
      if (!silent) toast.success('Usage probe complete');
    } catch (e) {
      toast.error('Bulk probe failed', e);
    } finally {
      setProgress(null);
    }
  };

  const autoRanRef = useRef(false);
  useEffect(() => {
    if (autoRanRef.current) return;
    if (agg.loading || agg.total === 0) return;
    autoRanRef.current = true;
    void runProbe(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agg.loading, agg.total]);

  const result = probe.data;
  const totalResources = result
    ? Object.values(result.byTarget).reduce((a, b) => a + b, 0)
    : 0;

  const inUseData = result
    ? [
        { label: 'In use', value: result.inUse, color: '#107C10' },
        { label: 'Not in use', value: result.notInUse, color: '#D13438' },
      ]
    : [];

  const topExtensions = result
    ? result.entries
        .filter((e) => e.total > 0)
        .map((e) => ({ label: e.name, value: e.total }))
    : [];

  const relProbed = (() => {
    if (probe.isPending && progress)
      return `Probing ${progress.done} / ${progress.total}…`;
    if (probe.isPending) return 'Probing…';
    if (!lastProbed) return agg.loading ? 'Loading extensions…' : 'Not probed yet';
    const sec = Math.round((Date.now() - lastProbed.getTime()) / 1000);
    if (sec < 60) return `Updated ${sec}s ago`;
    const min = Math.round(sec / 60);
    if (min < 60) return `Updated ${min} min ago`;
    return `Updated at ${lastProbed.toLocaleTimeString()}`;
  })();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Title2>Usage monitor</Title2>
        <div className={styles.headerMeta}>
          <Caption1>{relProbed}</Caption1>
          <Tooltip content="Refresh usage probe" relationship="label">
            <Button
              appearance="subtle"
              icon={<ArrowClockwise20Regular />}
              onClick={() => runProbe(false)}
              disabled={probe.isPending || agg.loading || agg.total === 0}
              aria-label="Refresh usage probe"
            />
          </Tooltip>
        </div>
      </div>
      <Body1 className={styles.intro}>
        Counts non-null values for every extension across every supported
        target type, so you can see at a glance what's being used and what's
        dormant. The probe runs automatically on entry.
      </Body1>
      {probe.isPending && (
        <ProgressBar
          value={progress ? progress.done / progress.total : undefined}
        />
      )}

      <div className={styles.grid}>
        <StatCard
          title="Extensions probed"
          value={result ? result.inUse + result.notInUse : agg.total}
          hint={`${agg.schemaCount} schema · ${agg.directoryCount} directory`}
        />
        <StatCard
          title="In use"
          value={
            result
              ? `${result.inUse} / ${result.inUse + result.notInUse}`
              : '…'
          }
          hint={result ? `${result.notInUse} not in use` : 'Waiting for probe'}
        />
        <StatCard
          title="Resources with a value"
          value={result ? totalResources : '…'}
          hint="Sum across every target type"
        />
        <StatCard
          title="Probe errors"
          value={result ? result.errors : '…'}
          hint={
            result?.errors
              ? 'See individual rows for detail'
              : 'No errors reported'
          }
        />
      </div>

      <div className={styles.grid}>
        <ChartCard
          title="In use vs not in use"
          hint={result ? 'From the last probe.' : 'Probing…'}
        >
          <Donut data={inUseData} />
        </ChartCard>
        <ChartCard
          title="Resources by target type"
          hint="Where the actual values live."
        >
          <HorizontalBars
            data={
              result
                ? Object.entries(result.byTarget).map(([label, value]) => ({
                    label,
                    value,
                  }))
                : []
            }
          />
        </ChartCard>
        <ChartCard
          title="Top extensions by usage"
          hint="Extensions with the most non-null resources."
        >
          <HorizontalBars data={topExtensions} />
        </ChartCard>
      </div>

      <div className={styles.panel}>
        <ExtensionsOverview
          description="Per-extension drill-down. Use a row's Probe button for a single-extension usage report."
          renderActions={(src) => (
            <Button
              size="small"
              icon={<DataUsage16Regular />}
              onClick={() => setTarget(src)}
            >
              Probe
            </Button>
          )}
        />
      </div>

      {target?.kind === 'schema' && (
        <UsageDialog
          variant="schema"
          open={true}
          onOpenChange={(o) => !o && setTarget(null)}
          ext={target.ext}
        />
      )}
      {target?.kind === 'directory' && (
        <UsageDialog
          variant="directory"
          open={true}
          onOpenChange={(o) => !o && setTarget(null)}
          ext={target.ext}
        />
      )}
    </div>
  );
}
