export type User = "thomas" | "beate";

export type Priority = "high" | "medium" | "low";

export type Recurrence = "weekly" | "monthly" | "quarterly" | null;

export type TaskStatus = "open" | "done";

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string | null; // ISO date string
  status: TaskStatus;
  recurrence: Recurrence;
  createdAt: string;
  updatedAt: string;
  projectContext?: string;
}

export interface Note {
  id: string;
  content: string;
  createdAt: string;
  projectContext?: string;
}

export interface DelegatedTask {
  id: string;
  from: User;
  to: User;
  title: string;
  priority: Priority;
  dueDate: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ProjectContext {
  id: string;
  name: string;
  summary: string;
  updatedAt: string;
}

export interface UserData {
  tasks: Task[];
  notes: Note[];
  projects: ProjectContext[];
  delegatedTasks: DelegatedTask[]; // shared between both users
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface IrisAction {
  type:
    | "create_task"
    | "update_task"
    | "complete_task"
    | "create_note"
    | "delegate_task"
    | "complete_delegated_task"
    | "update_project"
    | "extract_tasks";
  // create_task / update_task
  title?: string;
  priority?: Priority;
  dueDate?: string | null;
  recurrence?: Recurrence;
  projectContext?: string;
  // complete_task
  taskId?: string;
  // create_note
  content?: string;
  // delegate_task
  to?: User;
  // update_project
  projectName?: string;
  projectSummary?: string;
  // extract_tasks — multiple tasks from a protocol
  tasks?: Array<{
    title: string;
    priority: Priority;
    dueDate: string | null;
    assignedTo?: User | "self";
  }>;
}

export interface IrisResponse {
  message: string;
  actions?: IrisAction[];
}
