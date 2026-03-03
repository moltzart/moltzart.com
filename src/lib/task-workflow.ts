export const TASK_BOARD_STATUSES = ["backlog", "todo", "in_progress", "done"] as const;

export type TaskStatus = (typeof TASK_BOARD_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
};

const TASK_STATUS_RANK: Record<TaskStatus, number> = {
  backlog: 0,
  todo: 1,
  in_progress: 2,
  done: 3,
};

export function normalizeTaskStatusInput(value: unknown): TaskStatus {
  if (typeof value !== "string") return "backlog";

  switch (value) {
    case "backlog":
    case "todo":
    case "in_progress":
    case "done":
      return value;
    case "open":
      return "backlog";
    default:
      return "backlog";
  }
}

export function getTaskStatusRank(value: string): number {
  return TASK_STATUS_RANK[normalizeTaskStatusInput(value)];
}

export function isTaskDone(value: string): boolean {
  return normalizeTaskStatusInput(value) === "done";
}
