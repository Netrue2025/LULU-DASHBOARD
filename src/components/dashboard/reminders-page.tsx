"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ReminderManager } from "@/components/dashboard/reminder-manager";

export function RemindersPage() {
  return (
    <DashboardShell title="Reminder Management" subtitle="Set, edit, delete, and review reminder history">
      <ReminderManager />
    </DashboardShell>
  );
}
