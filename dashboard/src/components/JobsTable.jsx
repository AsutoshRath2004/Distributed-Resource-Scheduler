function formatDuration(job) {
  if (!job.startedAt || !job.completedAt) return '—';
  const ms = new Date(job.completedAt) - new Date(job.startedAt);
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString();
}

export default function JobsTable({ jobs }) {
  if (!jobs.length) {
    return (
      <div className="empty-state">
        <p>No jobs submitted yet.</p>
        <p className="text-tertiary">Submit a job via the scheduler API to see it appear here.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="jobs-table">
        <thead>
          <tr>
            <th>Job ID</th>
            <th>Type</th>
            <th>Priority</th>
            <th>Worker</th>
            <th>Status</th>
            <th>Retries</th>
            <th>Duration</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.jobId}>
              <td className="mono">{job.jobId.replace('job-', '').slice(0, 8)}</td>
              <td>{job.jobType}</td>
              <td>
                <span className={`priority-pill priority-${job.priority}`}>{job.priority}</span>
              </td>
              <td className="mono text-secondary">{job.assignedWorker || '—'}</td>
              <td>
                <span className={`status-pill status-${job.status}`}>{job.status}</span>
              </td>
              <td className="mono text-tertiary">{job.retryCount > 0 ? job.retryCount : '—'}</td>
              <td className="mono text-tertiary">{formatDuration(job)}</td>
              <td className="mono text-tertiary">{formatTime(job.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}