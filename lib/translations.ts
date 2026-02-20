export const translations = {
    ko: {
        nav: {
            about: "소개",
            blog: "블로그",
            papers: "논문",
            datasets: "데이터셋",
            market_intelligence: "주식 시장 분석",
            reports: "리포트 아카이브",
        },
        common: {
            subscribe: "구독하기",
            logo: "SHawn_LAB",
        },
        hero: {
            badge: "Dr.SHawn의 새로운 지식 저장소",
            title: {
                part1: "바이오 지식",
                part2: "일상의 효율",
                part3: "수익의 발견",
                conjunction1: "과 ",
                conjunction2: ", 그리고 "
            },
            description: "복잡한 생명공학 이슈부터 스마트한 라이프스타일 꿀팁, 지속 가능한 수익 창출 전략까지. 더 나은 삶을 위한 인사이트를 제공합니다.",
            readBlog: "블로그 읽기",
            aboutMe: "Dr.SHawn 소개",
        },
        category: {
            title: "핵심 주제 파헤치기",
            description: "당신의 호기심을 자극하고 성장을 돕는 세 가지 주요 영역입니다.",
            bio: {
                title: "Bio Knowledge",
                desc: "최신 생명공학 트렌드와 연구 분석, 그리고 건강에 대한 깊이 있는 통찰력.",
            },
            life: {
                title: "Daily Life",
                desc: "생산성을 높이는 도구, 효율적인 시간 관리, 그리고 삶의 질을 높이는 노하우.",
            },
            market_intelligence: {
                title: "Market Intelligence",
                desc: "SHawn-INV 알고리즘 기반의 한/미 주식 시장 자동 분석 리포트.",
            },
            explore: "탐험하기",
        },
        footer: {
            builtBy: "Built by",
            author: "Dr.SHawn",
            sourceCode: "소스 코드는 GitHub에서 확인 가능합니다.",
        }
    },
    en: {
        nav: {
            about: "About",
            blog: "Blog",
            papers: "Papers",
            datasets: "Datasets",
            market_intelligence: "Market Intelligence",
            reports: "Report Archive",
        },
        common: {
            subscribe: "Subscribe",
            logo: "SHawn_LAB",
        },
        hero: {
            badge: "Dr.SHawn's New Knowledge Repository",
            title: {
                part1: "Bio Knowledge",
                part2: "Daily Efficiency",
                part3: "Revenue Discovery",
                conjunction1: ", ",
                conjunction2: ", and "
            },
            description: "From complex biotech issues to smart lifestyle tips and sustainable revenue strategies. Insights for a better life.",
            readBlog: "Read Blog",
            aboutMe: "About Dr.SHawn",
        },
        category: {
            title: "Explore Core Topics",
            description: "Three key areas to stimulate your curiosity and help you grow.",
            bio: {
                title: "Bio Knowledge",
                desc: "Latest biotech trends, research analysis, and deep insights into health.",
            },
            life: {
                title: "Daily Life",
                desc: "Productivity tools, efficient time management, and know-how to improve quality of life.",
            },
            market_intelligence: {
                title: "Market Intelligence",
                desc: "Automated market analysis reports based on SHawn-INV algorithms.",
            },
            explore: "Explore",
        },
        footer: {
            builtBy: "Built by",
            author: "Dr.SHawn",
            sourceCode: "Source code available on GitHub.",
        }
    },
} as const;

export type Language = keyof typeof translations;
