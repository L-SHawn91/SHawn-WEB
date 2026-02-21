import { useMemo, useState } from 'react';
import { DashboardScreen } from './screens/DashboardScreen';
import { OpenClawChatPanel } from './screens/OpenClawChatPanel';
import { ProjectBoardScreen } from './screens/ProjectBoardScreen';

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
      <header className="top-nav">
        <div className="brand">OpenClaw Desktop</div>
        <nav className="top-nav__menu">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`nav-btn ${active === item.id ? 'active' : ''}`}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <section className="status-bar" aria-label="시스템 상태">
        <span className="status-pill ok">Mac Main: 정상</span>
        <span className="status-pill ok">Linux Worker: 정상</span>
        <span className="status-pill warn">OpenClaw Queue: 2개 대기</span>
        <span className="status-pill">마지막 동기화: 방금 전</span>
      </section>

      <main className="content">{screen}</main>
    </div>
  );
}
