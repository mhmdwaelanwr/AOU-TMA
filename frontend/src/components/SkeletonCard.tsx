export function SkeletonCard() {
  return (
    <div className="course-card skeleton-card" aria-hidden="true" role="status">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div className="skeleton-line" style={{ width: '60px', height: '28px', borderRadius: '9px', marginBottom: '8px' }} />
          <div className="skeleton-line wide" />
          <div className="skeleton-line medium" style={{ marginTop: '6px' }} />
        </div>
        <div className="skeleton-line" style={{ width: '42px', height: '24px', borderRadius: '999px' }} />
      </div>
      <div className="skeleton-line" style={{ width: '100%', height: '11px', marginTop: '4px' }} />
      <div className="skeleton-line" style={{ width: '80%', height: '11px', marginTop: '4px' }} />
      <div className="card-divider" />
      <div className="skeleton-grid"><span /><span /></div>
      <div className="skeleton-footer"><span /><span /></div>
    </div>
  );
}
