"use client";

import { useMemo, useState } from "react";
import type { DbTask } from "@/lib/db";
import {
  Calendar,
  CircleAlert,
  RefreshCw,
  GripVertical,
} from "lucide-react";
import { Panel } from "@/components/admin/panel";
import { PageHeader } from "@/components/admin/page-header";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  TASK_BOARD_STATUSES,
  TASK_STATUS_LABELS,
  type TaskStatus,
  normalizeTaskStatusInput,
} from "@/lib/task-workflow";

type TaskColumns = Record<TaskStatus, DbTask[]>;
type DragOverState = { status: TaskStatus; index: number } | null;

function getBoardOrder(task: DbTask, fallback: number): number {
  const n = Number(task.board_order);
  return Number.isFinite(n) ? n : fallback;
}

function getCreatedAtComparable(task: DbTask): string {
  const raw = task.created_at as unknown;
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === "string") return raw;
  return String(raw ?? "");
}

function compareTasks(a: DbTask, b: DbTask): number {
  const boardDiff = getBoardOrder(a, 0) - getBoardOrder(b, 0);
  if (boardDiff !== 0) return boardDiff;

  if (a.due_date && b.due_date) {
    const dueDiff = a.due_date.localeCompare(b.due_date);
    if (dueDiff !== 0) return dueDiff;
  }

  if (a.due_date && !b.due_date) return -1;
  if (!a.due_date && b.due_date) return 1;

  return getCreatedAtComparable(a).localeCompare(getCreatedAtComparable(b));
}

function buildColumns(tasks: DbTask[]): TaskColumns {
  const columns: TaskColumns = {
    backlog: [],
    todo: [],
    in_progress: [],
    done: [],
  };

  for (const task of tasks) {
    const status = normalizeTaskStatusInput(task.status);
    columns[status].push({ ...task, status });
  }

  for (const status of TASK_BOARD_STATUSES) {
    columns[status].sort(compareTasks);
  }

  return columns;
}

function computeBoardOrder(targetTasks: DbTask[], targetIndex: number): number {
  const prev = targetIndex > 0 ? getBoardOrder(targetTasks[targetIndex - 1], targetIndex) : null;
  const next = targetIndex < targetTasks.length ? getBoardOrder(targetTasks[targetIndex], targetIndex + 1) : null;

  if (prev !== null && next !== null) {
    const middle = (prev + next) / 2;
    if (Number.isFinite(middle) && middle > prev && middle < next) return middle;
    return prev + 0.0001;
  }

  if (prev !== null) return prev + 1;
  if (next !== null) return next - 1;
  return 1;
}

function moveTask(
  tasks: DbTask[],
  taskId: string,
  toStatus: TaskStatus,
  toIndex: number
): { nextData: DbTask[]; movedTask: DbTask } | null {
  const columns = buildColumns(tasks);
  let sourceStatus: TaskStatus | null = null;
  let sourceIndex = -1;

  for (const status of TASK_BOARD_STATUSES) {
    const idx = columns[status].findIndex((task) => task.id === taskId);
    if (idx !== -1) {
      sourceStatus = status;
      sourceIndex = idx;
      break;
    }
  }

  if (!sourceStatus || sourceIndex < 0) return null;

  const sourceTasks = [...columns[sourceStatus]];
  const [movingTask] = sourceTasks.splice(sourceIndex, 1);
  if (!movingTask) return null;

  const targetTasks = sourceStatus === toStatus ? sourceTasks : [...columns[toStatus]];
  let adjustedIndex = toIndex;
  if (sourceStatus === toStatus && toIndex > sourceIndex) {
    adjustedIndex -= 1;
  }

  const clampedIndex = Math.max(0, Math.min(adjustedIndex, targetTasks.length));
  if (sourceStatus === toStatus && clampedIndex === sourceIndex) return null;

  const boardOrder = computeBoardOrder(targetTasks, clampedIndex);
  const movedTask: DbTask = {
    ...movingTask,
    status: toStatus,
    board_order: boardOrder,
  };

  const nextData = tasks.map((task) => (task.id === taskId ? movedTask : task));
  return { nextData, movedTask };
}

function TaskCard({
  task,
  saving,
  onDragStart,
  onDragEnd,
  onOpenDetail,
}: {
  task: DbTask;
  saving: boolean;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onOpenDetail: (taskId: string) => void;
}) {
  const isDone = task.status === "done";
  const canOpenDetail = !isDone;
  const showMeta = !isDone && (Boolean(task.due_date) || Boolean(task.blocked_by));

  return (
    <div
      draggable={!saving}
      onDragStart={() => onDragStart(task.id)}
      onDragEnd={onDragEnd}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && canOpenDetail) {
          e.preventDefault();
          onOpenDetail(task.id);
        }
      }}
      onClick={() => {
        if (canOpenDetail) onOpenDetail(task.id);
      }}
      tabIndex={0}
      className={`group rounded-lg border border-zinc-800/60 bg-zinc-900/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/60 ${
        "p-2"
      } ${
        saving ? "opacity-60" : "cursor-grab active:cursor-grabbing"
      }`}
      aria-label={`Task ${task.title}. Drag to move.`}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={14} className={`${isDone ? "mt-0" : "mt-1"} text-zinc-600 shrink-0`} />
        <div className="min-w-0 flex-1">
          <p className={`type-body-sm ${isDone ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
            {task.title}
          </p>
          {showMeta && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {task.due_date && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded type-badge border border-zinc-800/80 bg-zinc-900/60 text-zinc-400">
                  <Calendar size={10} />
                  {task.due_date}
                </span>
              )}
              {task.blocked_by && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded type-badge border border-orange-400/20 bg-orange-400/10 text-orange-300/80">
                  <CircleAlert size={10} />
                  blocked
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DropSlot({
  active,
  onDragOver,
  onDrop,
}: {
  active: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      className={`rounded transition-[height,background-color,border-color] duration-200 ${active ? "h-4 bg-teal-400/20 border border-teal-400/40" : "h-1"}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    />
  );
}

export function TasksView({ initialData }: { initialData: DbTask[] }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<DragOverState>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const columns = useMemo(() => buildColumns(data), [data]);
  const detailTask = useMemo(
    () => (detailTaskId ? data.find((task) => task.id === detailTaskId) ?? null : null),
    [data, detailTaskId]
  );
  const stats = useMemo(() => ({
    backlog: columns.backlog.length,
    todo: columns.todo.length,
    inProgress: columns.in_progress.length,
    done: columns.done.length,
  }), [columns]);

  async function persistMove(task: DbTask) {
    const res = await fetch(`/api/admin/task/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: task.status,
        board_order: task.board_order,
      }),
    });
    if (!res.ok) {
      throw new Error("Failed to persist move");
    }
  }

  async function applyMove(taskId: string, toStatus: TaskStatus, toIndex: number) {
    if (savingTaskId) return;

    const previousData = data;
    const result = moveTask(previousData, taskId, toStatus, toIndex);
    if (!result) return;

    setError("");
    setData(result.nextData);
    setSavingTaskId(taskId);

    try {
      await persistMove(result.movedTask);
    } catch {
      setData(previousData);
      setError("Could not save task move. Try again.");
    } finally {
      setSavingTaskId(null);
      setDraggingTaskId(null);
      setDragOver(null);
    }
  }

  function handleDrop(status: TaskStatus, index: number, e: React.DragEvent) {
    e.preventDefault();
    if (!draggingTaskId) return;
    void applyMove(draggingTaskId, status, index);
  }

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setData(await res.json());
        setError("");
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Tasks">
        <span className="flex items-center gap-2 type-body-sm">
          <span className="text-zinc-300">{stats.backlog}</span>
          <span className="text-zinc-600">backlog</span>
          <span className="text-zinc-300">{stats.todo}</span>
          <span className="text-zinc-600">todo</span>
          <span className="text-amber-400">{stats.inProgress}</span>
          <span className="text-zinc-600">in progress</span>
          <span className="text-emerald-400">{stats.done}</span>
          <span className="text-zinc-600">done</span>
        </span>
        {savingTaskId && (
          <span className="type-body-sm text-zinc-600">saving...</span>
        )}
        <button
          onClick={refresh}
          disabled={loading}
          className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </PageHeader>

      <Panel className="flex flex-col h-[calc(100svh-10rem)] overflow-hidden">

      {error && (
        <div className="px-4 py-2 border-b border-zinc-800/30">
          <p className="type-body-sm text-red-400/80">{error}</p>
        </div>
      )}

      {data.length === 0 ? (
        <p className="type-body-sm text-zinc-500 py-8 text-center">No tasks yet.</p>
      ) : (
        <div className="flex-1 min-h-0 overflow-x-auto p-3">
          <div className="min-w-[1080px] h-full grid grid-cols-4 gap-3">
            {TASK_BOARD_STATUSES.map((status) => {
              const tasks = columns[status];
              return (
                <div
                  key={status}
                  className="flex h-full min-h-0 flex-col rounded-lg border border-zinc-800/40 bg-zinc-950/40"
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="px-3 py-2 border-b border-zinc-800/40 flex items-center justify-between">
                    <span className="type-body-sm font-medium text-zinc-200">{TASK_STATUS_LABELS[status]}</span>
                    <span className="type-body-sm text-zinc-600">{tasks.length}</span>
                  </div>
                  <div className="p-2 space-y-1 min-h-0 overflow-y-auto">
                    {tasks.map((task, index) => (
                      <div key={task.id} className="space-y-1">
                        <DropSlot
                          active={dragOver?.status === status && dragOver.index === index}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (draggingTaskId) setDragOver({ status, index });
                          }}
                          onDrop={(e) => handleDrop(status, index, e)}
                        />
                        <TaskCard
                          task={task}
                          saving={savingTaskId === task.id}
                          onDragStart={(taskId) => {
                            setDraggingTaskId(taskId);
                            setError("");
                          }}
                          onDragEnd={() => {
                            setDraggingTaskId(null);
                            setDragOver(null);
                          }}
                          onOpenDetail={(taskId) => setDetailTaskId(taskId)}
                        />
                      </div>
                    ))}
                    <DropSlot
                      active={dragOver?.status === status && dragOver.index === tasks.length}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (draggingTaskId) setDragOver({ status, index: tasks.length });
                      }}
                      onDrop={(e) => handleDrop(status, tasks.length, e)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <Sheet open={Boolean(detailTask)} onOpenChange={(open) => !open && setDetailTaskId(null)}>
        <SheetContent side="right" className="bg-zinc-950 border-zinc-800 text-zinc-100 w-full sm:max-w-md">
          <SheetHeader className="border-b border-zinc-800/60">
            <SheetTitle className="text-zinc-100 type-h3">
              {detailTask?.title ?? "Task"}
            </SheetTitle>
            <SheetDescription className="text-zinc-500 type-body-sm">
              {detailTask ? TASK_STATUS_LABELS[normalizeTaskStatusInput(detailTask.status)] : ""}
            </SheetDescription>
          </SheetHeader>
          {detailTask && (
            <div className="px-4 py-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-zinc-800/70 bg-zinc-900/40 px-3 py-2">
                  <p className="type-badge text-zinc-500">Due</p>
                  <p className="type-body-sm text-zinc-200 mt-1">{detailTask.due_date || "—"}</p>
                </div>
                <div className="rounded border border-zinc-800/70 bg-zinc-900/40 px-3 py-2">
                  <p className="type-badge text-zinc-500">Blocked By</p>
                  <p className="type-body-sm text-zinc-200 mt-1">{detailTask.blocked_by || "—"}</p>
                </div>
              </div>
              <div className="rounded border border-zinc-800/70 bg-zinc-900/30 px-3 py-3">
                <p className="type-badge text-zinc-500">Detail</p>
                <p className="type-body-sm text-zinc-300 mt-2 whitespace-pre-wrap">
                  {detailTask.detail || "No detail added."}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Panel>
    </div>
  );
}
