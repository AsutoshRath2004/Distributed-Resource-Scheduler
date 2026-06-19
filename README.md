# Distributed Resource Scheduler

A backend system that distributes incoming jobs across multiple worker nodes based on live CPU and memory availability, monitors worker health in real time, and automatically recovers and reassigns jobs when a worker fails — with a live monitoring dashboard built on top.

This project simulates the core coordination problem behind systems like Kubernetes or a cloud task scheduler: given several machines with varying load, which one should run the next job, and what happens when that machine disappears mid-task.

## What it does

- Worker nodes register themselves with a central scheduler and report CPU/memory usage every 5 seconds
- The scheduler scores every active worker by available resources and assigns each incoming job to the best candidate
- Jobs move through a full lifecycle: `pending → assigned → running → completed` (or `failed`)
- If a worker stops sending heartbeats, the scheduler detects it within 15 seconds, marks it offline, and automatically re-queues and reassigns any jobs it was running — with zero manual intervention
- A React dashboard shows live worker status, resource usage charts, job history, and a real-time activity feed via WebSockets

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Scheduler Service                     │
│                      (Express, :3001)                    │
│                                                            │
│   REST API          Scheduler Engine      Worker Monitor │
│  /workers/*          (resource-aware       (heartbeat     │
│  /jobs/*              scoring loop)         watchdog)     │
│                                                            │
└───────┬──────────────────────┬───────────────────────────┘
        │                      │
   ┌────▼─────┐          ┌─────▼─────┐
   │ MongoDB  │          │   Redis   │
   │ (history)│          │ (queue +  │
   │          │          │ live state)│
   └──────────┘          └─────┬─────┘
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
            ┌─────▼──────┐            ┌──────▼─────┐
            │  Worker 1  │            │  Worker 2  │
            │ (Express,  │            │ (Express,  │
            │   :3002)   │            │   :3003)   │
            └────────────┘            └────────────┘

            React Dashboard (Vite, :5173)
            connects to scheduler via REST + Socket.IO
```

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Services | Node.js + Express | Lightweight, fast to iterate on for multiple independent services |
| Persistent storage | MongoDB | Durable job/worker history — queryable audit trail with full timestamps |
| Fast state | Redis | Job queue (`BRPOP`/`LPUSH`) and live worker stats — too frequent and too ephemeral for MongoDB |
| Real-time updates | Socket.IO | Pushes worker/job state changes to the dashboard instantly instead of polling |
| Dashboard | React + Vite + Recharts | Live resource charts and a responsive ops-console UI |

MongoDB and Redis are split deliberately: MongoDB holds what needs to survive a restart and be queried later (job results, retry counts, error history). Redis holds what needs to be fast and is fine to lose (the pending-job queue, the current heartbeat snapshot) — checking MongoDB on every scheduling decision would add unnecessary latency.

## The scheduling algorithm

When a job needs a worker, the scheduler reads every registered worker's live stats from Redis, discards anyone offline or whose last heartbeat is older than the timeout window, and scores the rest:

```
score = (100 − cpuUsage) × 0.6 + (100 − memUsage) × 0.4
```

The highest-scoring worker wins. CPU availability is weighted higher than memory because CPU is typically the bottleneck for compute-style workloads — this is a tunable assumption, not a hard rule, and the weighting can be adjusted per workload type.

## Fault tolerance

This is the part that distinguishes the project from a simple job queue. A background monitor runs every 10 seconds and checks for any worker whose last heartbeat is older than 15 seconds. When it finds one:

1. The worker is marked `offline` in both MongoDB and Redis
2. Any job that was `assigned` or `running` on that worker is marked `failed` and pushed back onto the pending queue with a `retried` flag
3. The scheduler's main loop picks it up on its very next iteration and reassigns it to a healthy worker
4. The job's `retryCount` is incremented, and its error is cleared on successful retry

This was tested directly: a worker was killed mid-job while running a 20+ second simulated task. The scheduler detected the missing heartbeat, failed the stuck job, reassigned it to the remaining worker, and completed it successfully — all automatically, with the dashboard reflecting every step live.

## Job lifecycle

```
pending → assigned → running → completed
                   ↘ running → failed → (re-queued) → assigned (retry)
```

## Project structure

```
distributed-resource-scheduler/
├── scheduler-service/      # Central coordinator
│   └── src/
│       ├── config/         # MongoDB + Redis connections
│       ├── models/         # Worker, Job schemas
│       ├── routes/         # /workers, /jobs REST endpoints
│       └── services/       # scoring engine, heartbeat monitor
├── worker-service/         # Worker node (run multiple instances)
│   └── src/
│       ├── config/         # Redis connection
│       └── services/       # registration, heartbeat loop, job execution
└── dashboard/              # React + Vite monitoring UI
    └── src/
        ├── components/     # worker cards, job table, chart, activity feed
        └── hooks/          # Socket.IO live-state hook
```

## Running it locally

Requires Node.js, MongoDB, and Redis running locally (or via Docker).

```bash
# Install all dependencies (root workspace covers scheduler + worker)
npm install

# Terminal 1 — scheduler
npm run dev:scheduler

# Terminal 2 — worker instance 1
npm run dev:worker

# Terminal 3 — worker instance 2 (different ID/port)
WORKER_ID=worker-2 WORKER_PORT=3003 npm run dev:worker

# Terminal 4 — dashboard
cd dashboard
npm install
npm run dev
```

Dashboard runs at `http://localhost:5173`. Submit a job to see it flow through the system:

```bash
curl -X POST http://localhost:3001/jobs \
  -H "Content-Type: application/json" \
  -d '{"jobType":"data-processing","priority":"high","payload":{"file":"report.csv"}}'
```

## API reference

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/workers/register` | Worker registers itself on startup |
| `POST` | `/workers/heartbeat` | Worker reports live CPU/memory every 5s |
| `GET` | `/workers` | List all workers and their current status |
| `POST` | `/jobs` | Submit a new job |
| `GET` | `/jobs` | List all jobs (optional `?status=` filter) |
| `GET` | `/jobs/:jobId` | Get a single job's full record |
| `PATCH` | `/jobs/:jobId/status` | Worker reports job state transitions |

## Possible extensions

- Priority-aware queue ordering (currently FIFO within the pending queue)
- Configurable scoring weights per job type
- Horizontal scaling test with 5+ concurrent workers
- Authentication on the job submission API
