interface Props {
  status: string;
  onClick?: (e?: React.MouseEvent) => void;
  className?: string;
}

export function StatusPill({ status, onClick, className }: Props) {
  const normalized = status.toUpperCase();

  const isLive = normalized === "LIVE";
  const isPositive =
    normalized === "ACTIVE" ||
    normalized === "UPCOMING" ||
    normalized === "ONGOING" ||
    normalized === "COMPLETED" ||
    normalized === "SAVED" ||
    normalized === "VERIFIED";
  const isPending =
    normalized === "PENDING" ||
    normalized === "WARNING" ||
    normalized === "DRAFT";
  const isDanger =
    normalized === "CANCELLED" ||
    normalized === "ERROR" ||
    normalized === "REJECTED" ||
    normalized === "SUSPENDED";

  let colorClasses = "bg-transparent border border-black/24 dark:border-white/28 text-black/72 dark:text-white/72";
  if (isLive) {
    colorClasses = "bg-crimson text-white border border-crimson";
  } else if (isPositive) {
    colorClasses = "bg-navy/8 dark:bg-navy-tint/12 text-navy dark:text-navy-tint border border-navy/20 dark:border-navy-tint/30";
  } else if (isPending) {
    colorClasses = "bg-black/4 dark:bg-white/6 text-black/90 dark:text-white/92 border border-black/10 dark:border-white/12";
  } else if (isDanger) {
    colorClasses = "bg-crimson/8 dark:bg-crimson-tint/12 text-crimson dark:text-crimson-tint border border-crimson/20 dark:border-crimson-tint/30";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses} ${className || ""}`}
      onClick={onClick}
    >
      {normalized}
    </span>
  );
}
