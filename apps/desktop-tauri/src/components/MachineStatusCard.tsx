import type { MachineStatusCard as MachineStatusCardType } from '../data/mockData';

type Props = {
  card: MachineStatusCardType;
};

function statusBadge(status: MachineStatusCardType['status']) {
  if (status === 'running') {
    return 'Running';
  }
  if (status === 'alert') {
    return 'Alert';
  }
  return 'Ready';
}

export function MachineStatusCard({ card }: Props) {
  return (
    <article className={`status-card ${card.platform} ${card.status}`}>
      <header className="status-card__header">
        <span>
          {card.platform === 'mac' ? '🍎 Mac' : '🐧 Linux'} · {card.role}
        </span>
        <strong>{statusBadge(card.status)}</strong>
      </header>
      <div className="status-card__body">
        <p>
          <span>호스트</span>
          <strong>{card.host}</strong>
        </p>
        <p>
          <span>CPU</span>
          <strong>{card.cpu}%</strong>
        </p>
        <p>
          <span>Memory</span>
          <strong>{card.memory}%</strong>
        </p>
        <p>
          <span>실행 중 작업</span>
          <strong>{card.tasks}개</strong>
        </p>
        <p>
          <span>마지막 동기화</span>
          <strong>{card.lastSync}</strong>
        </p>
      </div>
    </article>
  );
}
