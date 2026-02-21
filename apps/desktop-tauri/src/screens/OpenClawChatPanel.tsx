import { mockChatMessages } from '../data/mockData';

export function OpenClawChatPanel() {
  return (
    <section>
      <header className="screen-header">
        <h1>OpenClaw 채팅 패널</h1>
        <p>실시간 알림과 운영자 피드백을 테스트하기 위한 목업 채팅 창입니다.</p>
      </header>

      <article className="chat-panel panel">
        <div className="chat-list">
          {mockChatMessages.map((message) => (
            <div className="chat-item" key={message.id}>
              <header>
                <strong>{message.sender}</strong>
                <span>{message.time}</span>
              </header>
              <p>{message.body}</p>
            </div>
          ))}
        </div>
        <div className="chat-input-row">
          <input type="text" placeholder="메시지 입력 (목업)" />
          <button type="button">전송</button>
        </div>
      </article>
    </section>
  );
}
