"use client";

import { useEffect } from "react";

const ICON_HINTS: Record<string, string> = {
  "trending-up": "상승 추세 또는 강세 시그널",
  "trending-down": "하락 추세 또는 약세 시그널",
  "refresh-cw": "데이터 새로고침",
  "calendar": "날짜 또는 일정 정보",
  "file-text": "리포트/문서 보기",
  "external-link": "외부/새 창 열기",
  globe: "글로벌/미국 시장 컨텍스트",
  "arrow-left": "이전 페이지 또는 허브로 이동",
  "alert-triangle": "주의 또는 리스크 알림",
  activity: "실시간 상태 또는 변동성 지표",
  brain: "AI 분석/추론 모듈",
  "bar-chart-2": "차트 기반 성능 분석",
  "message-square": "채팅 또는 문의",
  languages: "언어 전환",
  menu: "모바일 메뉴 열기",
  sun: "라이트 테마",
  moon: "다크 테마",
};

const KEYWORD_HINTS: Array<{ key: string; hint: string }> = [
  { key: "market intelligence", hint: "시장 리포트 허브로 이동합니다." },
  { key: "investment dashboard", hint: "투자 시그널/리밸런싱 대시보드입니다." },
  { key: "report archive", hint: "과거 리포트를 날짜 기준으로 조회합니다." },
  { key: "active alpha", hint: "상대적으로 매수 우선순위가 높은 구간입니다." },
  { key: "risk management", hint: "주의/관망 종목 중심 리스크 구간입니다." },
  { key: "future value", hint: "목표가/전망 중심의 미래가치 요약입니다." },
  { key: "signal weight", hint: "최종 점수 계산에 반영되는 모듈 비중입니다." },
  { key: "watchlist", hint: "모니터링 우선 종목과 경보 목록입니다." },
  { key: "리밸런싱", hint: "포트폴리오 비중 조정 제안/시뮬레이션입니다." },
  { key: "투자 워크스페이스", hint: "투자 관련 기능을 통합한 허브입니다." },
  { key: "시장 특성", hint: "지역별 시장 구조/유동성 요약입니다." },
  { key: "신호 가중치", hint: "기술/수급/매크로/뉴스의 반영 비율입니다." },
  { key: "전략 모드", hint: "알파/방어/균형 전략 프리셋을 선택합니다." },
  { key: "검색", hint: "기업명 또는 티커로 종목을 조회합니다." },
  { key: "대시보드", hint: "핵심 지표와 신호를 한 화면에서 확인합니다." },
  { key: "리포트", hint: "분석 리포트 상세를 확인합니다." },
  { key: "아카이브", hint: "과거 리포트를 모아 확인합니다." },
  { key: "refresh", hint: "최신 데이터로 다시 조회합니다." },
  { key: "score", hint: "종목의 종합 신호 점수입니다." },
  { key: "신뢰도", hint: "현재 분석 결과의 신뢰 수준입니다." },
];

function cleanHint(value: string): string {
  return value.replace(/�/g, "").replace(/\s+/g, " ").trim();
}

function compactText(value: string, max = 42): string {
  const cleaned = cleanHint(value);
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

function nearestContextText(el: Element): string {
  const candidates = [
    el.closest("button"),
    el.closest("a"),
    el.closest("article"),
    el.closest("section"),
    el.closest("[class*='panel']"),
    el.parentElement,
  ].filter(Boolean) as Element[];

  for (const node of candidates) {
    const text = compactText(node.textContent || "");
    if (text && text.length >= 2) return text;
  }
  return "";
}

function buildIconHint(iconKey: string, context: string): string {
  const base = cleanHint(ICON_HINTS[iconKey] || "관련 기능 아이콘");
  if (!context) return base;
  return `${base} · ${context}`;
}

function applyIconHints(root: ParentNode) {
  const icons = root.querySelectorAll<SVGElement>("svg.lucide");
  icons.forEach((icon) => {
    if (icon.getAttribute("data-hover-bound") === "1") return;
    if (icon.hasAttribute("title")) return;

    const classes = Array.from(icon.classList);
    const iconClass = classes.find((cls) => cls.startsWith("lucide-"));
    const key = iconClass ? iconClass.replace("lucide-", "") : "";
    const context = nearestContextText(icon);
    const hint = buildIconHint(key, context);
    if (hint) {
      icon.setAttribute("title", cleanHint(hint));
      if (!icon.getAttribute("aria-label")) {
        icon.setAttribute("aria-label", cleanHint(hint));
      }
    }
    icon.setAttribute("data-hover-bound", "1");
  });
}

function applyKeywordHints(root: ParentNode) {
  const nodes = root.querySelectorAll<HTMLElement>(
    "h1,h2,h3,h4,h5,h6,button,a,[class*='badge'],[class*='chip'],[class*='panel']"
  );
  nodes.forEach((node) => {
    if (node.getAttribute("data-hover-keyword-bound") === "1") return;
    if (node.hasAttribute("title")) return;
    const text = (node.textContent || "").trim();
    if (!text || text.length < 2 || text.length > 80) {
      node.setAttribute("data-hover-keyword-bound", "1");
      return;
    }

    const lowered = text.toLowerCase();
    const hit = KEYWORD_HINTS.find((item) => lowered.includes(item.key.toLowerCase()));
    if (hit) {
      const context = compactText(text);
      const message = cleanHint(`${hit.hint} · ${context}`);
      node.setAttribute("title", message);
    }
    node.setAttribute("data-hover-keyword-bound", "1");
  });
}

export function GlobalHoverHints() {
  useEffect(() => {
    let rafId = 0;

    const run = () => {
      applyIconHints(document);
      applyKeywordHints(document);
    };

    const schedule = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(run);
    };

    run();

    const observer = new MutationObserver(() => {
      schedule();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  return null;
}
