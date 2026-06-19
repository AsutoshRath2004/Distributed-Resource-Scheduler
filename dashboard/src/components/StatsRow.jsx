function StatCard({ label, value, tone = 'neutral' }) {
  return (
    <div className="stat-card">
      <div className={`stat-value tone-${tone}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function StatsRow({ workers, jobs }) {
  const activeWorkers = workers.filter((w) => w.status === 'active' || w.status === 'idle').length;
  const offlineWorkers = workers.filter((w) => w.status === 'offline').length;
  const pendingJobs = jobs.filter((j) => j.status === 'pending').length;
  const runningJobs = jobs.filter((j) => j.status === 'running' || j.status === 'assigned').length;
  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const failedJobs = jobs.filter((j) => j.status === 'failed').length;

  return (
    <div className="stats-row">
      <StatCard label="Active workers" value={activeWorkers} tone="active" />
      <StatCard label="Offline workers" value={offlineWorkers} tone={offlineWorkers > 0 ? 'offline' : 'neutral'} />
      <StatCard label="Pending jobs" value={pendingJobs} tone="idle" />
      <StatCard label="Running jobs" value={runningJobs} tone="warning" />
      <StatCard label="Completed jobs" value={completedJobs} tone="active" />
      <StatCard label="Failed jobs" value={failedJobs} tone={failedJobs > 0 ? 'offline' : 'neutral'} />
    </div>
  );
}