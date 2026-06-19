export default function ActivityFeed({ events }) {
  if (!events.length) {
    return (
      <div className="empty-state">
        <p className="text-tertiary">Activity will appear here as it happens.</p>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      {events.map((e) => (
        <div key={e.id} className="activity-row">
          <span className={`status-dot tone-${e.tone}`} />
          <span className="activity-message">{e.message}</span>
          <span className="activity-time mono text-tertiary">
            {e.time.toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}