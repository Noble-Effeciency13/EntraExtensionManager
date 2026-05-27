import { ReactNode } from 'react';
import { Body1, Title3, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: '12px',
    padding: '64px 24px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
  },
  icon: {
    width: '56px',
    height: '56px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
});

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <div className={styles.icon}>{icon}</div>
      <Title3>{title}</Title3>
      {description ? <Body1>{description}</Body1> : null}
      {action}
    </div>
  );
}
