import { useMemo, useState } from 'react';
import { DashboardScreen } from './screens/DashboardScreen';
import { OpenClawChatPanel } from './screens/OpenClawChatPanel';
import { ProjectBoardScreen } from './screens/ProjectBoardScreen';
import { CommonChrome } from './components/CommonChrome';

export type Screen = 'dashboard' | 'project' | 'chat';

type NavItem = {
  id: Screen;
  label: string;
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: '대시보드' },
  { id: 'project', label: '프로젝트보드' },
  { id: 'chat', label: 'OpenClaw 채팅패널' },
];

const statusItems = [
  { label: 'Mac Main: 정상', tone: 'ok' as const },
  { label: 'Linux Worker: 정상', tone: 'ok' as const },
  { label: 'OpenClaw Queue: 2개 대기', tone: 'warn' as const },
  { label: '마지막 동기화: 방금 전' },
];

export function App() {
  const [active, setActive] = useState<Screen>('dashboard');

  const screen = useMemo(() => {
    switch (active) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'project':
        return <ProjectBoardScreen />;
      case 'chat':
        return <OpenClawChatPanel />;
      default:
        return null;
    }
  }, [active]);

  return (
    <div className="app-shell">
      <CommonChrome active={active} navItems={navItems} statusItems={statusItems} onNavigate={setActive} />
      <main className="content">{screen}</main>
    </div>
  );
}
