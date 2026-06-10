import { google } from "googleapis";
import { getOAuthClient } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function defaultTaskListId(tasksApi) {
  const r = await tasksApi.tasklists.list({ maxResults: 1 });
  return r.data.items?.[0]?.id || "@default";
}

/**
 * Tâches Google. Body : { action, accessToken, task?, taskId? }
 * action : "list" | "create" | "update" | "toggle" | "delete"
 * task : { title, notes, due (ISO), completed }
 */
export async function POST(req) {
  try {
    const { action, accessToken, task, taskId } = await req.json();
    if (!accessToken) return json({ error: "no_access_token" }, 401);

    const client = getOAuthClient(req);
    if (!client) return json({ error: "not_configured" }, 503);
    client.setCredentials({ access_token: accessToken });
    const tasksApi = google.tasks({ version: "v1", auth: client });
    const tasklist = await defaultTaskListId(tasksApi);

    if (action === "list") {
      const r = await tasksApi.tasks.list({ tasklist, showCompleted: true, showHidden: true, maxResults: 100 });
      const tasks = (r.data.items || []).map((t) => ({
        id: t.id,
        title: t.title || "(Sans titre)",
        notes: t.notes || "",
        due: t.due || null,
        completed: t.status === "completed",
      }));
      return json({ tasks });
    }

    if (action === "create") {
      const r = await tasksApi.tasks.insert({
        tasklist,
        requestBody: { title: task.title || "(Sans titre)", notes: task.notes || undefined, due: task.due || undefined },
      });
      return json({ ok: true, task: r.data });
    }

    if (action === "update") {
      const base = { title: task.title, notes: task.notes || undefined };
      if (task.due) {
        // Pose / met à jour la date limite.
        const r = await tasksApi.tasks.patch({
          tasklist, task: taskId, requestBody: { ...base, due: task.due },
        });
        return json({ ok: true, task: r.data });
      }
      // Aucune date limite : on efface `due`. Un patch ignore `null`, on fait donc
      // un update complet (PUT) en omettant le champ `due`.
      const cur = await tasksApi.tasks.get({ tasklist, task: taskId });
      const merged = { ...cur.data, ...base };
      delete merged.due;
      const r = await tasksApi.tasks.update({ tasklist, task: taskId, requestBody: merged });
      return json({ ok: true, task: r.data });
    }

    if (action === "toggle") {
      const r = await tasksApi.tasks.patch({
        tasklist,
        task: taskId,
        requestBody: { status: task.completed ? "completed" : "needsAction" },
      });
      return json({ ok: true, task: r.data });
    }

    if (action === "delete") {
      await tasksApi.tasks.delete({ tasklist, task: taskId });
      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    const msg = e?.message || "unknown_error";
    if (/insufficient.*scope|scope|permission|forbidden/i.test(msg)) {
      return json({ error: "insufficient_scope", detail: msg }, 403);
    }
    const status = /invalid|expired|unauthor/i.test(msg) ? 401 : 500;
    return json({ error: msg }, status);
  }
}
