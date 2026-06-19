import { useEffect, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const MAX_POINTS = 30;
const COLORS = ['#4ade80', '#60a5fa', '#fbbf24', '#fb7185', '#c084fc'];

export default function ResourceChart({ workers }) {
  const [history, setHistory] = useState([]);
  const lastSnapshotRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    // Throttle to one sample every ~2s so the line doesn't get noisy
    if (now - lastSnapshotRef.current < 2000) return;
    lastSnapshotRef.current = now;

    if (!workers.length) return;

    setHistory((prev) => {
      const point = { time: new Date().toLocaleTimeString().slice(0, 8) };
      workers.forEach((w) => {
        point[`${w.workerId}_cpu`] = Number(w.cpuUsage) || 0;
      });
      const next = [...prev, point];
      return next.slice(-MAX_POINTS);
    });
  }, [workers]);

  if (!workers.length) {
    return (
      <div className="empty-state">
        <p>No data yet.</p>
        <p className="text-tertiary">CPU usage will chart here once workers report heartbeats.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={history} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="#232b2d" strokeDasharray="3 3" />
        <XAxis dataKey="time" stroke="#5a6a6c" fontSize={11} tickLine={false} />
        <YAxis stroke="#5a6a6c" fontSize={11} domain={[0, 100]} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: '#161d1f',
            border: '1px solid #232b2d',
            borderRadius: 8,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
          }}
          labelStyle={{ color: '#8b9a9c' }}
        />
        {workers.map((w, i) => (
          <Line
            key={w.workerId}
            type="monotone"
            dataKey={`${w.workerId}_cpu`}
            name={`${w.workerId} CPU%`}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}