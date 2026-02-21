import { githubBoard, machineStatusCards } from '../data/mockData';
import { MachineStatusCard } from '../components/MachineStatusCard';

export function DashboardScreen() {
  return (
    <section>
      <header className="screen-header">
        <h1>대시보드</h1>
        <p>OpenClaw 오케스트레이션 상태를 한 화면에 요약합니다.</p>
      </header>

      <div className="grid-2">
        <div className="panel">
          <h2>GitHub 진행상황</h2>
          <div className="mini-grid">
            <article className="tile">
              <h3>PR</h3>
              <ul>
                {githubBoard.pullRequests.map((pr) => (
                  <li key={pr.title}>
                    <strong>[{pr.state}]</strong> {pr.title} — {pr.owner}
                  </li>
                ))}
              </ul>
            </article>
            <article className="tile">
              <h3>Issue</h3>
              <ul>
                {githubBoard.issues.map((issue) => (
                  <li key={issue.title}>
                    <strong>[{issue.severity}]</strong> {issue.title} — {issue.owner}
                  </li>
                ))}
              </ul>
            </article>
            <article className="tile">
              <h3>Branch</h3>
              <ul>
                {githubBoard.branches.map((branch) => (
                  <li key={branch.name}>
                    <strong>[{branch.age}]</strong> {branch.name} — {branch.owner}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>

        <div className="panel">
          <h2>노드 상태</h2>
          <div className="stacked-list">
            {machineStatusCards.map((card) => (
              <MachineStatusCard key={card.id} card={card} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
