"use client";

import { CalendarDays, Edit3, Eraser, History, Pause, Play, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SectionCard, StatusBadge } from "@/components/dashboard/shared";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import type { Reminder, ReminderHistoryItem } from "@/lib/types";

type ReminderPayload = {
  reminders: Reminder[];
  history: ReminderHistoryItem[];
  upcoming: Reminder[];
  detail?: string;
};

type Draft = {
  title: string;
  message: string;
  scheduleTime: string;
};

const emptyDraft: Draft = { title: "", message: "", scheduleTime: "" };

export function ReminderManager({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Reminder[]>([]);
  const [history, setHistory] = useState<ReminderHistoryItem[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const upcoming = useMemo(
    () => items.filter((item) => item.status !== "completed").sort((a, b) => +new Date(a.scheduleTime) - +new Date(b.scheduleTime)),
    [items]
  );

  useEffect(() => {
    void loadReminders();
  }, []);

  async function loadReminders() {
    setBusy(true);
    try {
      const response = await fetch("/api/lulu/reminders", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as ReminderPayload;
      if (!response.ok) throw new Error(data.detail ?? "Could not load reminders");
      applyPayload(data);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load reminders");
    } finally {
      setBusy(false);
    }
  }

  function applyPayload(data: ReminderPayload) {
    setItems(Array.isArray(data.reminders) ? data.reminders : []);
    setHistory(Array.isArray(data.history) ? data.history : []);
  }

  async function submitReminder() {
    if (!draft.title.trim() || !draft.scheduleTime) {
      setStatus("Add a title and schedule time first.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/lulu/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editingId ? "update" : "create",
          id: editingId,
          reminder: {
            title: draft.title,
            message: draft.message,
            scheduleTime: new Date(draft.scheduleTime).toISOString()
          }
        })
      });
      const data = (await response.json().catch(() => ({}))) as ReminderPayload;
      if (!response.ok) throw new Error(data.detail ?? "Could not save reminder");
      applyPayload(data);
      setDraft(emptyDraft);
      setEditingId("");
      setStatus(editingId ? "Reminder updated." : "Reminder set.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save reminder");
    } finally {
      setBusy(false);
    }
  }

  function editReminder(item: Reminder) {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      message: item.message,
      scheduleTime: toDatetimeLocal(item.scheduleTime)
    });
    setStatus("");
  }

  async function updateStatus(item: Reminder, nextStatus: Reminder["status"]) {
    await sendAction("update", item.id, { status: nextStatus });
  }

  async function deleteReminder(item: Reminder) {
    if (editingId === item.id) cancelEdit();
    await sendAction("delete", item.id);
  }

  async function clearHistory() {
    await sendAction("clear_history");
    setStatus("Reminder history cleared.");
  }

  async function sendAction(action: string, id = "", reminder?: Partial<Reminder>) {
    setBusy(true);
    try {
      const response = await fetch("/api/lulu/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, reminder })
      });
      const data = (await response.json().catch(() => ({}))) as ReminderPayload;
      if (!response.ok) throw new Error(data.detail ?? "Reminder action failed");
      applyPayload(data);
      if (action === "delete") setStatus("Reminder deleted.");
      if (action === "update") setStatus("Reminder updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Reminder action failed");
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    setEditingId("");
    setDraft(emptyDraft);
    setStatus("");
  }

  if (compact) {
    return (
      <SectionCard title="Reminders" action={<CalendarDays className="h-4 w-4 text-muted-foreground" />}>
        <ReminderForm
          busy={busy}
          draft={draft}
          editing={Boolean(editingId)}
          onCancel={cancelEdit}
          onChange={setDraft}
          onSubmit={submitReminder}
        />
        <div className="mt-4 space-y-2">
          {upcoming.slice(0, 4).map((item) => (
            <ReminderRow key={item.id} item={item} onDelete={deleteReminder} onEdit={editReminder} onStatus={updateStatus} />
          ))}
          {!upcoming.length ? <p className="rounded-md border bg-background px-3 py-3 text-sm text-muted-foreground">No upcoming reminders.</p> : null}
        </div>
        {status ? <p className="mt-3 text-xs text-muted-foreground">{status}</p> : null}
      </SectionCard>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <SectionCard title={editingId ? "Edit Reminder" : "Create Reminder"}>
          <ReminderForm
            busy={busy}
            draft={draft}
            editing={Boolean(editingId)}
            onCancel={cancelEdit}
            onChange={setDraft}
            onSubmit={submitReminder}
          />
          {status ? <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{status}</p> : null}
        </SectionCard>
        <SectionCard title="All Reminders">
          <div className="overflow-x-auto thin-scrollbar">
            <Table>
              <thead>
                <tr>
                  <Th>Title</Th>
                  <Th>Message</Th>
                  <Th>Schedule Time</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <Td className="font-medium">{item.title}</Td>
                    <Td>{item.message || "No message"}</Td>
                    <Td>{formatDate(item.scheduleTime)}</Td>
                    <Td><StatusBadge status={item.status} /></Td>
                    <Td>
                      <ReminderActions item={item} onDelete={deleteReminder} onEdit={editReminder} onStatus={updateStatus} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!items.length ? <p className="py-6 text-center text-sm text-muted-foreground">No reminders saved yet.</p> : null}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Upcoming Reminders">
          <div className="space-y-2">
            {upcoming.map((item) => <ReminderRow key={item.id} item={item} onDelete={deleteReminder} onEdit={editReminder} onStatus={updateStatus} />)}
            {!upcoming.length ? <p className="rounded-md border bg-background px-3 py-3 text-sm text-muted-foreground">No upcoming reminders.</p> : null}
          </div>
        </SectionCard>
        <SectionCard title="Reminder History" action={<Button variant="ghost" className="h-8 w-8 px-0" disabled={busy || !history.length} onClick={clearHistory} title="Clear reminder history"><Eraser className="h-4 w-4" /></Button>}>
          <div className="max-h-80 space-y-2 overflow-y-auto thin-scrollbar">
            {history.map((item) => (
              <div key={item.id} className="rounded-md border bg-background px-3 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.title || "Reminder"}</p>
                  <StatusBadge status={item.action} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.timestamp)} | {formatDate(item.scheduleTime)}</p>
                {item.message ? <p className="mt-2 text-xs text-muted-foreground">{item.message}</p> : null}
              </div>
            ))}
            {!history.length ? <p className="rounded-md border bg-background px-3 py-3 text-sm text-muted-foreground">No reminder history yet.</p> : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function ReminderForm({
  busy,
  draft,
  editing,
  onCancel,
  onChange,
  onSubmit
}: {
  busy: boolean;
  draft: Draft;
  editing: boolean;
  onCancel: () => void;
  onChange: (draft: Draft) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3">
      <Input placeholder="Title" value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} />
      <Textarea placeholder="Message" value={draft.message} onChange={(event) => onChange({ ...draft, message: event.target.value })} />
      <Input type="datetime-local" value={draft.scheduleTime} onChange={(event) => onChange({ ...draft, scheduleTime: event.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <Button className="w-full" disabled={busy} onClick={onSubmit}>
          {editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editing ? "Save" : "Set"}
        </Button>
        <Button variant="secondary" className="w-full" disabled={busy || !editing} onClick={onCancel}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ReminderRow({
  item,
  onDelete,
  onEdit,
  onStatus
}: {
  item: Reminder;
  onDelete: (item: Reminder) => void;
  onEdit: (item: Reminder) => void;
  onStatus: (item: Reminder, nextStatus: Reminder["status"]) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-background px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.scheduleTime)}</p>
        {item.message ? <p className="mt-1 break-words text-xs text-muted-foreground">{item.message}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge status={item.status} />
        <ReminderActions item={item} onDelete={onDelete} onEdit={onEdit} onStatus={onStatus} />
      </div>
    </div>
  );
}

function ReminderActions({
  item,
  onDelete,
  onEdit,
  onStatus
}: {
  item: Reminder;
  onDelete: (item: Reminder) => void;
  onEdit: (item: Reminder) => void;
  onStatus: (item: Reminder, nextStatus: Reminder["status"]) => void;
}) {
  const paused = item.status === "paused";
  return (
    <div className="flex gap-1">
      <Button variant="ghost" className="h-8 w-8 px-0" title="Edit reminder" onClick={() => onEdit(item)}>
        <Edit3 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" className="h-8 w-8 px-0" title={paused ? "Resume reminder" : "Pause reminder"} onClick={() => onStatus(item, paused ? "scheduled" : "paused")}>
        {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" className="h-8 w-8 px-0" title="Complete reminder" onClick={() => onStatus(item, "completed")}>
        <History className="h-4 w-4" />
      </Button>
      <Button variant="ghost" className="h-8 w-8 px-0" title="Delete reminder" onClick={() => onDelete(item)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Not scheduled";
  return date.toLocaleString();
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
