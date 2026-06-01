import { ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  Badge,
  Button,
  Menu,
  MenuDivider,
  MenuItem,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Spinner,
  Title3,
  ToggleButton,
  Tooltip,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import {
  DataPie24Regular,
  ExtendedDock24Regular,
  Info24Regular,
  WeatherMoon24Regular,
  WeatherSunny24Regular,
  SignOut24Regular,
  Eye24Regular,
  Edit24Regular,
  PersonSwap24Regular,
  Keyboard24Regular,
  History24Regular,
  DataUsage24Regular,
  Beaker24Regular,
  ClipboardCode24Regular,
} from '@fluentui/react-icons';
import { useMode } from '@/auth/mode';
import { useAppToast } from '@/hooks/useAppToast';
import { AboutDialog } from '@/components/AboutDialog';
import { BrandLogo } from '@/components/BrandLogo';
import { useGlobalKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { TenantSwitcher } from '@/components/TenantSwitcher';

const useStyles = makeStyles({
  root: {
    height: '100vh',
    maxHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '260px minmax(0, 1fr)',
    gridTemplateRows: '56px minmax(0, 1fr)',
    gridTemplateAreas: `
      'topbar topbar'
      'nav    main'
    `,
    backgroundColor: tokens.colorNeutralBackground2,
    overflow: 'hidden',
  },
  topbar: {
    gridArea: 'topbar',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: '20px',
    paddingRight: '20px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: tokens.colorBrandForeground1,
  },
  brandMark: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  modeGroup: {
    display: 'inline-flex',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    marginRight: '8px',
  },
  modeButton: {
    border: 'none',
    borderRadius: 0,
  },
  editBadge: {
    marginLeft: '4px',
  },
  nav: {
    gridArea: 'nav',
    minHeight: 0,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    overflowY: 'auto',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    ...shorthands.padding('10px', '12px'),
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground2,
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'background-color 120ms ease, color 120ms ease',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
  },
  navLinkActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
      color: tokens.colorBrandForeground1,
    },
  },
  navSectionLabel: {
    padding: '4px 12px',
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: tokens.colorNeutralForeground3,
  },
  navDivider: {
    height: '1px',
    margin: '4px 8px',
    backgroundColor: tokens.colorNeutralStroke2,
  },
  navSpacer: {
    flex: '1 1 auto',
  },
  main: {
    gridArea: 'main',
    minHeight: 0,
    overflow: 'auto',
    padding: '28px 32px',
    minWidth: 0,
  },
  userName: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
});

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { to: '/schema-extensions', label: 'Schema extensions', icon: <DataPie24Regular /> },
  {
    to: '/directory-extensions',
    label: 'Directory extensions',
    icon: <ExtendedDock24Regular />,
  },
];

const toolNavItems: NavItem[] = [
  { to: '/tools/audit-log', label: 'Audit log', icon: <History24Regular /> },
  { to: '/tools/usage', label: 'Usage monitor', icon: <DataUsage24Regular /> },
  {
    to: '/tools/validate-value',
    label: 'Validate value',
    icon: <Beaker24Regular />,
  },
  {
    to: '/tools/manifest-snippet',
    label: 'Manifest snippet',
    icon: <ClipboardCode24Regular />,
  },
];

interface AppShellProps {
  children: ReactNode;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function AppShell({ children, theme, onToggleTheme }: AppShellProps) {
  const styles = useStyles();
  const { instance, accounts } = useMsal();
  const account = instance.getActiveAccount() ?? accounts[0];
  const location = useLocation();
  const { mode, isEdit, setMode, switching } = useMode();
  const toast = useAppToast();
  const qc = useQueryClient();
  const [aboutOpen, setAboutOpen] = useState(false);

  const initials = (account?.name ?? account?.username ?? '?')
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleModeChange = async (next: 'read' | 'edit') => {
    if (next === mode || switching) return;
    const ok = await setMode(next);
    if (!ok && next === 'edit') {
      toast.error(
        'Edit mode not enabled',
        new Error(
          'Consent for read/write Graph scopes was cancelled or could not be granted.',
        ),
      );
    } else if (ok) {
      toast.success(
        next === 'edit' ? 'Edit mode enabled' : 'Read mode enabled',
        next === 'edit'
          ? 'Write actions are now available.'
          : 'Write actions are now hidden.',
      );
    }
  };

  useGlobalKeyboardShortcuts({
    onAbout: () => setAboutOpen(true),
    onToggleMode: () => {
      void handleModeChange(mode === 'edit' ? 'read' : 'edit');
    },
  });

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <BrandLogo size={28} />
          </div>
          <Title3>Entra Extensions Manager</Title3>
          {isEdit && (
            <Badge appearance="filled" color="danger" className={styles.editBadge}>
              Edit mode
            </Badge>
          )}
        </div>
        <div className={styles.topbarRight}>
          <TenantSwitcher />
          <div className={styles.modeGroup} role="group" aria-label="Access mode">
            <Tooltip content="Read mode — no write actions" relationship="label">
              <ToggleButton
                className={styles.modeButton}
                checked={mode === 'read'}
                icon={<Eye24Regular />}
                appearance={mode === 'read' ? 'primary' : 'subtle'}
                disabled={switching}
                onClick={() => handleModeChange('read')}
              >
                Read
              </ToggleButton>
            </Tooltip>
            <Tooltip
              content="Edit mode — full read/write (requires consent)"
              relationship="label"
            >
              <ToggleButton
                className={styles.modeButton}
                checked={mode === 'edit'}
                icon={switching ? <Spinner size="tiny" /> : <Edit24Regular />}
                appearance={mode === 'edit' ? 'primary' : 'subtle'}
                disabled={switching}
                onClick={() => handleModeChange('edit')}
              >
                Edit
              </ToggleButton>
            </Tooltip>
          </div>
          <Tooltip content="About this app" relationship="label">
            <Button
              appearance="subtle"
              icon={<Info24Regular />}
              onClick={() => setAboutOpen(true)}
              aria-label="About"
            />
          </Tooltip>
          <Tooltip
            content={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            relationship="label"
          >
            <Button
              appearance="subtle"
              icon={theme === 'light' ? <WeatherMoon24Regular /> : <WeatherSunny24Regular />}
              onClick={onToggleTheme}
              aria-label="Toggle theme"
            />
          </Tooltip>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle" aria-label="Account menu">
                <Avatar
                  name={account?.name ?? account?.username}
                  initials={initials}
                  color="colorful"
                  size={28}
                />
                <span style={{ marginLeft: 10 }} className={styles.userName}>
                  {account?.name ?? account?.username}
                </span>
              </Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList
                checkedValues={{
                  account: account ? [account.homeAccountId] : [],
                }}
                onCheckedValueChange={(_, { name, checkedItems }) => {
                  if (name !== 'account') return;
                  const id = checkedItems[checkedItems.length - 1];
                  const next = accounts.find((a) => a.homeAccountId === id);
                  if (next && next.homeAccountId !== account?.homeAccountId) {
                    instance.setActiveAccount(next);
                    qc.invalidateQueries();
                    toast.success(
                      'Active account switched',
                      next.username ?? next.name ?? '',
                    );
                  }
                }}
              >
                {accounts.length > 1 && (
                  <>
                    <MenuItem disabled icon={<PersonSwap24Regular />}>
                      Switch tenant / account
                    </MenuItem>
                    {accounts.map((a) => (
                      <MenuItemRadio
                        key={a.homeAccountId}
                        name="account"
                        value={a.homeAccountId}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong>{a.name ?? a.username}</strong>
                          <span style={{ fontSize: 11, opacity: 0.7 }}>
                            {a.tenantId}
                          </span>
                        </div>
                      </MenuItemRadio>
                    ))}
                    <MenuDivider />
                  </>
                )}
                <MenuItem
                  icon={<PersonSwap24Regular />}
                  onClick={() =>
                    instance
                      .loginPopup({
                        scopes: ['User.Read'],
                        prompt: 'select_account',
                      })
                      .then((res) => {
                        if (res?.account) instance.setActiveAccount(res.account);
                        qc.invalidateQueries();
                      })
                      .catch(console.error)
                  }
                >
                  Add account…
                </MenuItem>
                <MenuItem
                  icon={<Keyboard24Regular />}
                  onClick={() =>
                    toast.success(
                      'Keyboard shortcuts',
                      '/ focus search · n new · e toggle edit · ? about',
                    )
                  }
                >
                  Keyboard shortcuts
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon={<SignOut24Regular />}
                  onClick={() =>
                    instance.logoutPopup({ account }).catch(console.error)
                  }
                >
                  Sign out
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      </header>

      <nav className={styles.nav} aria-label="Primary">
        {navItems.map((item) => {
          const active =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + '/');
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <div className={styles.navSpacer} />
        <div className={styles.navDivider} role="separator" />
        <div className={styles.navSectionLabel}>Tools</div>
        {toolNavItems.map((item) => {
          const active =
            location.pathname === item.to ||
            location.pathname.startsWith(item.to + '/');
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <main className={styles.main}>{children}</main>
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  );
}
