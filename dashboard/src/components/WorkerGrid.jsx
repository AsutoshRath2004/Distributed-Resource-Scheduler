const statusLabel = {
  active: 'active',
  idle: 'idle',
  offline: 'offline',
};

function ResourceBar({ label, value }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const tone = pct > 80 ? 'offline' : pct > 60 ? 'warning' : 'active';
  return (
    <div className="resource-bar-row">
      <div className="resource-bar-label">
        <span>{label}</span>
        <span className="mono">{pct}%</span>
      </div>
      <div className="resource-bar-track">
        <div className={`resource-bar-fill tone-${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function WorkerGrid({ workers }) {
  if (!workers.length) {
    return (
      <div className="empty-state">
        <p>No workers registered yet.</p>
        <p className="text-tertiary">Start a worker process to see it appear here.</p>
      </div>
    );
  }

  return (
    <div className="worker-grid">
      {workers.map((w) => (
        <div key={w.workerId} className={`worker-card status-${w.status}`}>
          <div className="worker-card-header">
            <span className={`status-dot tone-${w.status === 'offline' ? 'offline' : w.status === 'active' ? 'active' : 'idle'}`} />
            <span className="mono worker-id">{w.workerId}</span>
            <span className="worker-status-text text-tertiary">{statusLabel[w.status] || w.status}</span>
          </div>
          <div className="worker-card-meta text-tertiary mono">
            {w.hostname} · port {w.port} · {w.cpuCores} cores
          </div>
          <ResourceBar label="CPU" value={w.cpuUsage} />
          <ResourceBar label="Memory" value={w.memUsage} />
        </div>
      ))}
    </div>
  );
}