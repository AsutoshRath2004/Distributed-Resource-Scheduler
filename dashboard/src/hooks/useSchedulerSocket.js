import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SCHEDULER_URL = import.meta.env.VITE_SCHEDULER_URL || 'http://localhost:3001';

export function useSchedulerSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]); // recent activity feed

  const pushEvent = useCallback((message, tone = 'neutral') => {
    setEvents((prev) => [
      { id: `${Date.now()}-${Math.random()}`, message, tone, time: new Date() },
      ...prev,
    ].slice(0, 30)); // keep last 30
  }, []);

  // Fetch initial snapshot via REST, then let sockets keep it live
  const fetchSnapshot = useCallback(async () => {
    try {
      const [workersRes, jobsRes] = await Promise.all([
        fetch(`${SCHEDULER_URL}/workers`),
        fetch(`${SCHEDULER_URL}/jobs`),
      ]);
      const workersData = await workersRes.json();
      const jobsData = await jobsRes.json();
      setWorkers(workersData);
      setJobs(jobsData);
    } catch (err) {
      console.error('Failed to fetch snapshot:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();

    const socket = io(SCHEDULER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      pushEvent('Connected to scheduler', 'active');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      pushEvent('Disconnected from scheduler', 'offline');
    });

    socket.on('worker:registered', (data) => {
      pushEvent(`Worker registered: ${data.workerId}`, 'active');
      fetchSnapshot();
    });

    socket.on('worker:heartbeat', (data) => {
      setWorkers((prev) =>
        prev.map((w) =>
          w.workerId === data.workerId
            ? { ...w, cpuUsage: data.cpuUsage, memUsage: data.memUsage, status: data.status }
            : w
        )
      );
    });

    socket.on('worker:offline', (data) => {
      pushEvent(`Worker offline: ${data.workerId}`, 'offline');
      setWorkers((prev) =>
        prev.map((w) => (w.workerId === data.workerId ? { ...w, status: 'offline' } : w))
      );
    });

    socket.on('job:created', (data) => {
      pushEvent(`Job queued: ${data.jobId.slice(0, 13)}… (${data.jobType})`, 'idle');
      fetchSnapshot();
    });

    socket.on('job:updated', (data) => {
      const tone =
        data.status === 'completed' ? 'active' : data.status === 'failed' ? 'offline' : 'idle';
      pushEvent(`Job ${data.jobId.slice(0, 13)}… → ${data.status}`, tone);
      fetchSnapshot();
    });

    socket.on('job:requeued', (data) => {
      pushEvent(`Job ${data.jobId.slice(0, 13)}… re-queued (${data.previousWorker} offline)`, 'warning');
      fetchSnapshot();
    });

    // Periodic snapshot refresh as a safety net in case an event is missed
    const interval = setInterval(fetchSnapshot, 8000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [fetchSnapshot, pushEvent]);

  return { connected, workers, jobs, events };
}