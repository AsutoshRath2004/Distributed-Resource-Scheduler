import { useSchedulerSocket } from './hooks/useSchedulerSocket';
import StatsRow from './components/StatsRow';
import WorkerGrid from './components/WorkerGrid';
import JobsTable from './components/JobsTable';
import ResourceChart from './components/ResourceChart';
import ActivityFeed from './components/ActivityFeed';
import './App.css';

export default function App() {
  const { connected, workers, jobs, events } = useSchedulerSocket();

  return (
    <div className="console">
      <header className="console-header">
        <div className="brand">
          <span className="brand-mark">◆</span>
          <span className="brand-name">Scheduler Console</span>
        </div>
        <div className="connection-indicator">
          <span className={`status-dot tone-${connected ? 'active' : 'offline'}`} />
          <span className="mono text-secondary">
            {connected ? 'live' : 'reconnecting…'}
          </span>
        </div>
      </header>

      <main className="console-body">
        <section className="main-column">
          <StatsRow workers={workers} jobs={jobs} />

          <div className="panel">
            <div className="panel-header">
              <h2>Workers</h2>
            </div>
            <WorkerGrid workers={workers} />
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Resource usage</h2>
            </div>
            <ResourceChart workers={workers} />
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Recent jobs</h2>
            </div>
            <JobsTable jobs={jobs} />
          </div>
        </section>

        <aside className="side-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Activity</h2>
            </div>
            <ActivityFeed events={events} />
          </div>
        </aside>
      </main>
    </div>
  );
}