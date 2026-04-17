// Gemeinsame Action-Verarbeitungslogik für Web-Chat und Teams Bot
// Wird von ChatInterface.tsx und teams-bot.ts genutzt

import {
  addTask,
  updateTask,
  completeTask,
  addNote,
  upsertProject,
  delegateTask,
  completeDelegatedTask,
} from "./storage";
import type { User, IrisAction, Task } from "./types";

export async function processIrisActions(
  user: User,
  actions: IrisAction[],
  currentTasks: Task[]
) {
  const otherUser: User = user === "thomas" ? "beate" : "thomas";

  for (const action of actions) {
    try {
      switch (action.type) {
        case "create_task":
          if (action.title) {
            await addTask(user, {
              title: action.title,
              priority: action.priority ?? "medium",
              dueDate: action.dueDate ?? null,
              recurrence: action.recurrence,
              projectContext: action.projectContext,
            });
          }
          break;

        case "update_task":
          if (action.taskId) {
            await updateTask(user, action.taskId, {
              title: action.title,
              priority: action.priority,
              dueDate: action.dueDate,
              recurrence: action.recurrence,
              projectContext: action.projectContext,
            });
          }
          break;

        case "complete_task":
          if (action.taskId) {
            const taskToComplete = currentTasks.find((t) => t.id === action.taskId);
            await completeTask(user, action.taskId, taskToComplete);
          }
          break;

        case "create_note":
          if (action.content) await addNote(user, action.content, action.projectContext);
          break;

        case "delegate_task":
          if (action.title && action.to) {
            await delegateTask(
              user,
              action.to as User,
              action.title,
              action.priority ?? "medium",
              action.dueDate ?? null
            );
          }
          break;

        case "complete_delegated_task":
          if (action.taskId) await completeDelegatedTask(action.taskId, user);
          break;

        case "update_project":
          if (action.projectName && action.projectSummary) {
            await upsertProject(user, action.projectName, action.projectSummary);
          }
          break;

        case "extract_tasks":
          if (action.tasks) {
            for (const t of action.tasks) {
              if (t.assignedTo === "self" || !t.assignedTo) {
                await addTask(user, { title: t.title, priority: t.priority, dueDate: t.dueDate });
              } else if (t.assignedTo === otherUser) {
                await delegateTask(user, otherUser, t.title, t.priority, t.dueDate);
              }
            }
          }
          break;
      }
    } catch (err) {
      console.error(`Aktion ${action.type} fehlgeschlagen:`, err);
    }
  }
}
