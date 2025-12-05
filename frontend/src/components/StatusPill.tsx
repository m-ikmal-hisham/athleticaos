


interface Props {
  status: string;
  onClick?: (e?: React.MouseEvent) => void;
}

export function StatusPill({ status, onClick }: Props) {
  const normalized = status.toUpperCase();

  const isActive =
    normalized === "ACTIVE" ||
    normalized === "UPCOMING" ||
    normalized === "ONGOING";

  const className = `status-pill ${isActive ? "status-pill--active" : "status-pill--inactive"}`;

  return (
    <span className={className} onClick={onClick}>
      {normalized}
    </span>
  );
}
