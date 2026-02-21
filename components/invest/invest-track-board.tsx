"use client";

const statuses = [
  {
    name: "APP",
    label: "APP",
    status: "Healthy",
    detail: "Core UI/Route ready",
    tone: "bg-emerald-500/10 text-emerald-200 border-emerald-300/40",
  },
  {
    name: "INVEST",
    label: "Invest",
    status: "Operational",
    detail: "Market Intelligence + Dashboard",
    tone: "bg-blue-500/10 text-blue-200 border-blue-300/40",
  },
  {
    name: "INTEGRATION",
    label: "Integration",
    status: "Synced",
    detail: "Reports route linked",
    tone: "bg-amber-500/10 text-amber-200 border-amber-300/40",
  },
];

type InvestTrackBoardProps = {
  compact?: boolean;
};

export function InvestTrackBoard({ compact = false }: InvestTrackBoardProps) {
  return (
    <div className="mt-4 sm:mt-5">
      {compact ? (
        <>
          <div className="sm:hidden overflow-x-auto">
            <p className="whitespace-nowrap text-xs text-gray-300">
              {statuses
                .map((item) => `${item.label}: ${item.status} (${item.detail})`)
                .join(" · ")}
            </p>
          </div>
          <div className="hidden sm:grid grid-cols-3 gap-3">
            {statuses.map((item) => (
              <div
                key={item.name}
                className={`rounded-xl border ${item.tone} px-3 py-2.5 sm:px-4 sm:py-3`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{item.label}</span>
                  <span>{item.status}</span>
                </div>
                <p className="mt-1 text-xs text-gray-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          {statuses.map((item) => (
            <div
              key={item.name}
              className={`rounded-xl border ${item.tone} px-3 py-2.5 sm:px-4 sm:py-3`}
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>{item.label}</span>
                <span>{item.status}</span>
              </div>
              <p className="mt-1 text-xs text-gray-300">{item.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
