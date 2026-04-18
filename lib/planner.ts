// Microsoft Planner Integration via Microsoft Graph API
// Synchronisiert Iris-Aufgaben mit Microsoft Planner

import type { User } from "./types";

const GRAPH_URL = "https://graph.microsoft.com/v1.0";

// Planner Plan IDs pro User (aus Env-Vars)
function getPlanId(user: User): string | null {
  if (user === "thomas") return process.env.PLANNER_PLAN_ID_THOMAS ?? null;
  if (user === "beate") return process.env.PLANNER_PLAN_ID_BEATE ?? null;
  return null;
}

// AAD Object ID pro User (für Aufgaben-Zuweisung)
function getAadId(user: User): string | null {
  if (user === "thomas") return process.env.TEAMS_AAD_ID_THOMAS ?? null;
  if (user === "beate") return process.env.TEAMS_AAD_ID_BEATE ?? null;
  return null;
}

// Microsoft Graph Token holen (App-Credentials, kein User-Login)
let cachedToken: { value: string; expires: number } | null = null;

async function getGraphToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires - 60000) {
    return cachedToken.value;
  }
  const tenantId = process.env.MICROSOFT_TENANT_ID!;
  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.MICROSOFT_APP_ID!,
        client_secret: process.env.MICROSOFT_APP_PASSWORD!,
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  );
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Graph Token Fehler: ${JSON.stringify(data)}`);
  }
  cachedToken = {
    value: data.access_token,
    expires: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

// Aufgabe in Planner anlegen
export async function createPlannerTask(
  user: User,
  title: string,
  dueDate: string | null,
  priority: "high" | "medium" | "low"
): Promise<string | null> {
  const planId = getPlanId(user);
  const aadId = getAadId(user);
  if (!planId) return null;

  try {
    const token = await getGraphToken();

    // Planner priority: 0=urgent, 2=important, 5=medium, 9=low
    const plannerPriority = priority === "high" ? 2 : priority === "medium" ? 5 : 9;

    const body: Record<string, unknown> = {
      planId,
      title,
      priority: plannerPriority,
    };

    if (dueDate) {
      body.dueDateTime = `${dueDate}T23:59:00Z`;
    }

    if (aadId) {
      body.assignments = {
        [aadId]: {
          "@odata.type": "microsoft.graph.plannerAssignment",
          orderHint: " !",
        },
      };
    }

    const res = await fetch(`${GRAPH_URL}/planner/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Planner createTask Fehler:", res.status, err);
      return null;
    }

    const task = await res.json();
    console.log("Planner Aufgabe erstellt:", task.id, title);
    return task.id as string;
  } catch (err) {
    console.error("Planner createTask Exception:", err);
    return null;
  }
}

// Aufgabe in Planner als erledigt markieren
export async function completePlannerTask(plannerId: string): Promise<void> {
  try {
    const token = await getGraphToken();

    // Erst ETag holen (Planner braucht If-Match Header)
    const getRes = await fetch(`${GRAPH_URL}/planner/tasks/${plannerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!getRes.ok) return;
    const etag = getRes.headers.get("ETag") ?? "*";

    // Als erledigt markieren (percentComplete = 100)
    await fetch(`${GRAPH_URL}/planner/tasks/${plannerId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "If-Match": etag,
      },
      body: JSON.stringify({ percentComplete: 100 }),
    });
    console.log("Planner Aufgabe erledigt:", plannerId);
  } catch (err) {
    console.error("Planner completeTask Exception:", err);
  }
}

// Aufgabe in Planner aktualisieren (Titel, Datum, Priorität)
export async function updatePlannerTask(
  plannerId: string,
  fields: {
    title?: string;
    dueDate?: string | null;
    priority?: "high" | "medium" | "low";
  }
): Promise<void> {
  try {
    const token = await getGraphToken();

    const getRes = await fetch(`${GRAPH_URL}/planner/tasks/${plannerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!getRes.ok) return;
    const etag = getRes.headers.get("ETag") ?? "*";

    const body: Record<string, unknown> = {};
    if (fields.title) body.title = fields.title;
    if (fields.dueDate !== undefined) {
      body.dueDateTime = fields.dueDate ? `${fields.dueDate}T23:59:00Z` : null;
    }
    if (fields.priority) {
      body.priority = fields.priority === "high" ? 2 : fields.priority === "medium" ? 5 : 9;
    }

    await fetch(`${GRAPH_URL}/planner/tasks/${plannerId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "If-Match": etag,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("Planner updateTask Exception:", err);
  }
}
