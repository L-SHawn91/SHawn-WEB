import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const targetFiles = [
  'app/invest/search/page.tsx',
  'components/market/ReportDetailView.tsx',
  'components/invest/invest-hub-page.tsx',
  'app/api/invest/snapshot/route.ts',
];

const banned = [
  /강한\s*매수\s*후보/g,
  /매수\s*우위/g,
  /분할\s*매수/g,
  /손절/g,
  /비중\s*(확대|축소|상향)/g,
  /진입\s*구간/g,
  /청산\s*구간/g,
  /Buy Opportunity/g,
  /Watch\/Sell/g,
  /Stop Loss/g,
  /Strong buy candidate/g,
  /Buy-leaning zone/g,
  /Scale in/g,
  /Reduce exposure/g,
  /Action Queue/g,
  /실행\s*후보/g,
  /decisionThresholds/g,
  /\bbuy\s*:/g,
  /\btrim\s*:/g,
  /signal:\s*"(Buy|Hold|Trim)"/g,
];

const requiredSafePhrases = [
  '투자 조언이 아닙니다',
  'education and commentary',
  'reference',
];

let failures = [];
for (const rel of targetFiles) {
  const abs = path.join(ROOT, rel);
  const text = fs.readFileSync(abs, 'utf8');
  for (const pattern of banned) {
    const matches = [...text.matchAll(pattern)].map((m) => `${rel}:${text.slice(0, m.index).split('\n').length}:${m[0]}`);
    failures.push(...matches);
  }
}

const contractPath = path.join(ROOT, 'docs', 'INVEST_REPORTS_API_CONTRACT.md');
if (!fs.existsSync(contractPath)) {
  failures.push('missing docs/INVEST_REPORTS_API_CONTRACT.md');
} else {
  const contract = fs.readFileSync(contractPath, 'utf8');
  for (const phrase of requiredSafePhrases) {
    if (!contract.includes(phrase)) failures.push(`contract missing phrase: ${phrase}`);
  }
  for (const phrase of ['schema_version', 'content_class', 'compliance', '/api/reports']) {
    if (!contract.includes(phrase)) failures.push(`contract missing field/API: ${phrase}`);
  }
}

if (failures.length) {
  console.error('INV public safety failures:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log('PASS invest public safety');
