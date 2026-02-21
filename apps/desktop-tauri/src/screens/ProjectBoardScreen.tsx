import { githubBoard } from '../data/mockData';

export function ProjectBoardScreen() {
  return (
    <section>
      <header className="screen-header">
        <h1>프로젝트보드</h1>
        <p>PR/Issue/Branch를 칸반 방식으로 스테이터스 보드처럼 구성한 목업입니다.</p>
      </header>

      <div className="kanban">
        <article className="panel board-col">
          <h2>To Do</h2>
          <ul>
            <li>PR 템플릿 검증 자동화</li>
            <li>Linux 알림 웹훅 테스트</li>
          </ul>
        </article>

        <article className="panel board-col">
          <h2>In Review</h2>
          <ul>
            {githubBoard.pullRequests
              .filter((pr) => pr.state === 'In Review')
              .map((pr) => (
                <li key={pr.title}>{pr.title}</li>
              ))}
          </ul>
        </article>

        <article className="panel board-col">
          <h2>Done</h2>
          <ul>
            <li>chore: lint 스크립트 정리</li>
            <li>feat: mock 데이터 타입 정의</li>
            {githubBoard.issues
              .filter((issue) => issue.severity === 'low')
              .map((issue) => (
                <li key={issue.title}>{issue.title}</li>
              ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
