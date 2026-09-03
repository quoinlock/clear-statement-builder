import { browserStorage } from '../../persist/localStorage.ts';
import { AppBar } from './AppBar.tsx';
import { SideNav } from './SideNav.tsx';
import { PanelHost } from './PanelHost.tsx';
import { AppStoreProvider, useAppStore } from './store.tsx';
import { Preview } from '../preview/Preview.tsx';
import { HelpModal } from '../help/HelpModal.tsx';
import { FieldHelpModal } from '../statement/FieldHelp.tsx';

const storage = browserStorage();

function PersistenceToast() {
  const { persistenceIssue, dismissPersistenceIssue } = useAppStore();
  if (!persistenceIssue) return null;
  return (
    <div role="alert" className="panel no-print" style={{ borderColor: 'var(--red)', margin: '0 22px' }}>
      <strong>Storage problem:</strong> {persistenceIssue}{' '}
      <button type="button" className="btn" onClick={dismissPersistenceIssue}>
        Dismiss
      </button>
    </div>
  );
}

export function App() {
  return (
    <AppStoreProvider storage={storage}>
      <AppBar />
      <PersistenceToast />
      <div className="shell">
        <SideNav />
        <div className="editor-col no-print">
          <PanelHost />
        </div>
        <Preview />
      </div>
      <HelpModal />
      <FieldHelpModal />
    </AppStoreProvider>
  );
}
