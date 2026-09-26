import React from "react";

export type IconName =
  | "home" | "map" | "car" | "clock" | "grid" | "gate" | "report"
  | "settings" | "bell" | "search" | "arrow" | "check" | "close"
  | "calendar" | "card" | "user" | "alert" | "download" | "plus"
  | "chevron" | "logout" | "filter" | "more" | "shield" | "edit"
  | "trash" | "refresh";

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  map: <><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z"/><path d="M8 3v15M16 6v15"/></>,
  car: <><path d="m5 11 1.5-4.5h11L19 11"/><path d="M3 11h18v7H3zM6 18v2M18 18v2M7 14h.01M17 14h.01"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  gate: <><path d="M4 21V8M20 21V8M2 8h20M7 8V4h10v4M6 13h12M6 17h12"/></>,
  report: <><path d="M5 3h14v18H5zM8 16v-3M12 16V8M16 16v-5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.07.07-2.76 2.76-.07-.07a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.65V21H10v-.1A1.8 1.8 0 0 0 9 19.4a1.8 1.8 0 0 0-2 .36l-.07.07-2.76-2.76.07.07A1.8 1.8 0 0 0 9 4.6 1.8 1.8 0 0 0 10.1 3H14a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.36l.07-.07 2.76 2.76-.07.07a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.6 1.1V14a1.8 1.8 0 0 0-1.6 1Z"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  alert: <><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  logout: <><path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10"/></>,
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"/>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  shield: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></>,
  edit: <><path d="m14 5 5 5M4 20l4-1 11-11-3-3L5 16l-1 4Z"/></>,
  trash: <><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></>,
  refresh: <><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></>,
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export const Badge = ({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) => <span className={`badge ${tone}`}>{children}</span>;
