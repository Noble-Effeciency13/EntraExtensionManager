import { ReactNode } from 'react';
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useMsal,
} from '@azure/msal-react';
import {
  Button,
  Title1,
  Body1,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { PersonAccounts24Regular } from '@fluentui/react-icons';
import { loginRequest } from './msalConfig';

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `radial-gradient(circle at 30% 20%, ${tokens.colorBrandBackground2}, ${tokens.colorNeutralBackground1} 70%)`,
  },
  card: {
    padding: '48px 56px',
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow28,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignItems: 'flex-start',
    maxWidth: '460px',
  },
  iconWrap: {
    width: '56px',
    height: '56px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function AuthGate({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const { instance } = useMsal();

  return (
    <>
      <AuthenticatedTemplate>{children}</AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <div className={styles.root}>
          <div className={styles.card}>
            <div className={styles.iconWrap}>
              <PersonAccounts24Regular />
            </div>
            <Title1>Entra Extensions Manager</Title1>
            <Body1>
              Sign in with an Entra ID account that has permission to read the
              directory schema. The app starts in <strong>Read mode</strong> (no
              write access); you can elevate to <strong>Edit mode</strong> later,
              which prompts for additional consent.
            </Body1>
            <Button
              appearance="primary"
              size="large"
              onClick={() => instance.loginPopup(loginRequest).catch(console.error)}
            >
              Sign in
            </Button>
          </div>
        </div>
      </UnauthenticatedTemplate>
    </>
  );
}
