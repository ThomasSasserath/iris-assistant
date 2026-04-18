// Server-seitige Action-Verarbeitung für Teams Bot
// Ruft Supabase direkt auf (kein HTTP-Umweg) + Planner Sync

import { supabase } from "./supabase-server";
import { createPlannerTask, completePlannerTask, updatePlannerTask } from "./planner";
import type { User, IrisAction, Task, Priority, Recurrence } from "./types";

export async function processIrisActionsServer(
  user: User,
  actions: IrisAction[],
  currentTasks: Task[]
) {
  const otherUser: User = user === "thomas" ? "beate" : "thomas";

  for (const action of actions) {
    try {
      switch (action.type) {
        case "create_task": {
          if (!action.title) break;
          const { data } = await supabase.from("tasks").insert({
            user_id: user,
            title: action.title,
            priority: action.priority ?? "medium",
            due_date: action.dueDate ?? null,
            recurrence: action.recurrence ?? null,
            project_context: action.projectContext ?? null,
          }).select().single();

          // Planner Sync
          if (data?.id) {
            const plannerId = await createPlannerTask(
              user, action.title, action.dueDate ?? null, action.priority ?? "medium"
            );
            if (plannerId) {
              await supabase.from("tasks").update({ planner_id: plannerId }).eq("id", data.id);
            }
          }
          break;
        }

        case "update_task": {
          if (!action.taskId) break;
          const updates: Record<string, unknown> = {};
          if (action.title !== undefined) updates.title = action.title;
          if (action.priority !== undefined) updates.priority = action.priority;
          if (action.dueDate !== undefined) updates.due_date = action.dueDate;
          if (action.recurrence !== undefined) updates.recurrence = action.recurrence;
          if (action.projectContext !== undefined) updates.project_context = action.projectContext;

          if (Object.keys(updates).length > 0) {
            const { data: task } = await supabase.from("tasks").select("planner_id").eq("id", action.taskId).single();
            await supabase.from("tasks").update(updates).eq("id", action.taskId).eq("user_id", user);
            if (task?.planner_id) {
              await updatePlannerTask(task.planner_id, {
                title: action.title,
                dueDate: action.dueDate,
                priority: action.priority,
              });
            }
          }
          break;
        }

        case "complete_task": {
          if (!action.taskId) break;
          const { data: task } = await supabase.from("tasks").select("*").eq("id", action.taskId).single();
          await supabase.from("tasks").update({ status: "done" }).eq("id", action.taskId).eq("user_id", user);

          // Planner Sync
          if (task?.planner_id) await completePlannerTask(task.planner_id);

          // Wiederkehrende Aufgabe neu anlegen
          if (task?.recurrence && task.due_date) {
            const nextDate = calcNextDueDate(task.due_date, task.recurrence);
            const { data: newTask } = await supabase.from("tasks").insert({
              user_id: user,
              title: task.title,
              priority: task.priority,
              due_date: nextDate,
              recurrence: task.recurrence,
              project_context: task.project_context,
            }).select().single();

            if (newTask?.id) {
              const plannerId = await createPlannerTask(user, task.title, nextDate, task.priority);
              if (plannerId) await supabase.from("tasks").update({ planner_id: plannerId }).eq("id", newTask.id);
            }
          }
          break;
        }

        case "create_note":
          if (action.content) {
            await supabase.from("notes").insert({
              user_id: user,
              content: action.content,
              project_context: action.projectContext ?? null,
            });
          }
          break;

        case "delegate_task":
          if (action.title && action.to) {
            await supabase.from("delegated_tasks").insert({
              from_user: user,
              to_user: action.to,
              title: action.title,
              priority: action.priority ?? "medium",
              due_date: action.dueDate ?? null,
            });
          }
          break;

        case "complete_delegated_task":
          if (action.taskId) {
            await supabase.from("delegated_tasks")
              .update({ status: "done", completed_at: new Date().toISOString() })
              .eq("id", action.taskId);
          }
          break;

        case "update_project":
          if (action.projectName && action.projectSummary) {
            await supabase.from("projects").upsert({
              user_id: user,
              name: action.projectName,
              summary: action.projectSummary,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id,name" });
          }
          break;

        case "extract_tasks":
          if (action.tasks) {
            for (const t of action.tasks) {
              if (t.assignedTo === "self" || !t.assignedTo) {
                const { data } = await supabase.from("tasks").insert({
                  user_id: user,
                  title: t.title,
                  priority: t.priority ?? "medium",
                  due_date: t.dueDate ?? null,
                }).select().single();
                if (data?.id) {
                  const plannerId = await createPlannerTask(user, t.title, t.dueDate ?? null, t.priority ?? "medium");
                  if (plannerId) await supabase.from("tasks").update({ planner_id: plannerId }).eq("id", data.id);
                }
              } else if (t.assignedTo === otherUser) {
                await supabase.from("delegated_tasks").insert({
                  from_user: user,
                  to_user: otherUser,
                  title: t.title,
                  priority: t.priority ?? "medium",
                  due_date: t.dueDate ?? null,
                });
              }
            }
          }
          break;
      }
    } catch (err) {
      console.error(`Server-Aktion ${action.type} fehlgeschlagen:`, err);
    }
  }
}

function calcNextDueDate(currentDue: string, recurrence: string): string {
  const date = new Date(currentDue);
  if (recurrence === "weekly") date.setDate(date.getDate() + 7);
  else if (recurrence === "monthly") date.setMonth(date.getMonth() + 1);
  else if (recurrence === "quarterly") date.setMonth(date.getMonth() + 3);
  return date.toISOString().split("T")[0];
}
