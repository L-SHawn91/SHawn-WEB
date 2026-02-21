export type WorkItemStatus = 'ready' | 'running' | 'alert';

export type MachineStatusCard = {
  id: string;
  platform: 'mac' | 'linux';
  role: string;
  host: string;
  cpu: number;
  memory: number;
  tasks: number;
  status: WorkItemStatus;
  lastSync: string;
};

export const machineStatusCards: MachineStatusCard[] = [
  {
    id: 'machine-mac-main',
    platform: 'mac',
    role: '메인 컨트롤러',
    host: 'MBP-01',
    cpu: 22,
    memory: 46,
    tasks: 8,
    status: 'running',
    lastSync: '방금 전',
  },
  {
    id: 'machine-linux-01',
    platform: 'linux',
    role: '워커 노드',
    host: 'linux-01',
    cpu: 68,
    memory: 72,
    tasks: 14,
    status: 'alert',
    lastSync: '2분 전',
  },
  {
    id: 'machine-linux-02',
    platform: 'linux',
    role: '워커 노드',
    host: 'linux-02',
    cpu: 41,
    memory: 59,
    tasks: 11,
    status: 'running',
    lastSync: '1분 전',
  },
];

export const githubBoard = {
  pullRequests: [
    { title: 'feat: add project timeline view', owner: 's1', state: 'Open' },
    { title: 'fix: adjust worker heartbeat timer', owner: 's2', state: 'In Review' },
    { title: 'chore: bump lint dependencies', owner: 's3', state: 'Merged' },
  ],
  issues: [
    { title: 'PR/Issue 동기화 지연', owner: 'bot', severity: 'high' },
    { title: '메모리 상태 카드 실시간 렌더링', owner: 'dev', severity: 'medium' },
    { title: '채팅 패널 메시지 하이라이트', owner: 'ui', severity: 'low' },
  ],
  branches: [
    { name: 'feature/dashboard-cards', owner: 's1', age: '5h' },
    { name: 'feat/chat-mock', owner: 'ui', age: '1d' },
    { name: 'bugfix/tauri-dev', owner: 'infra', age: '7h' },
  ],
};

export const mockChatMessages = [
  {
    id: 'm1',
    sender: 'OpenClaw Core',
    time: '09:14',
    body: 'Linux 워커 01에서 큐 응답 지연이 감지되어 PR/Issue 동기화 확인 권장',
  },
  {
    id: 'm2',
    sender: 'Research Bot',
    time: '09:16',
    body: '최근 PR 테스트: 14개 통과, 1개 경고. macOS 메인 노드는 안정 상태입니다.',
  },
  {
    id: 'm3',
    sender: 'DevOps',
    time: '09:18',
    body: 'dashboard에 실시간 카드 렌더링 로직이 연결되었습니다. 다음 단계: 알림/필터 추가 예정',
  },
];
