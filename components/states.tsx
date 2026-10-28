/** A loading value is a flat grey bar at the size of what it stands in for; the layout never shifts when the data lands. */
export function Bar({ width, height = 14, className = "" }: { width: number | string; height?: number; className?: string }) {
  return <span className={`skeleton ${className}`} style={{ width, height }} aria-hidden="true" />;
}

export function LoadingRows({ rows, height = 44 }: { rows: number; height?: number }) {
  return (
    <div className="rows" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="row" style={{ minHeight: height }}>
          <Bar width="40%" />
          <span className="flex-1" />
          <Bar width={48} />
        </div>
      ))}
    </div>
  );
}

/** An error stays inside the block that failed, says what failed, and offers to try again. */
export function ErrorBlock({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <p className="error" role="alert">
      Couldn&apos;t load {what}.
      <button type="button" className="btn ghost" onClick={onRetry}>
        Try again
      </button>
    </p>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="empty">{children}</p>;
}
