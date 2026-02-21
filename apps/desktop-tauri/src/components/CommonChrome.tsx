import type { Screen } from '../App';

type NavItem = {
  id: Screen;
  label: string;
};

type StatusItem = {
  label: string;
  tone?: 'ok' | 'warn';
};

type CommonChromeProps = {
  active: Screen;
  navItems: NavItem[];
  statusItems: StatusItem[];
  onNavigate: (screen: Screen) => void;
};

export function CommonChrome({ active, navItems, statusItems, onNavigate }: CommonChromeProps) {
  return (
    <>
      <header className="top-nav">
        <div className="brand">OpenClaw Desktop</div>
        <nav className="top-nav__menu">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`nav-btn ${active === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <section className="status-bar" aria-label="시스템 상태">
        {statusItems.map((item) => (
          <span key={item.label} className={`status-pill ${item.tone ?? ''}`.trim()}>
            {item.label}
          </span>
        ))}
      </section>
    </>
  );
}
