"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LuluMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

type MessagePayload = {
  messages?: LuluMessage[];
  pending?: LuluMessage[];
  unread?: LuluMessage[];
  scheduled?: LuluMessage[];
  unreadCount?: number;
  pendingCount?: number;
};

export function MessageModal({
  open,
  onClose,
  initialMessages
}: {
  open: boolean;
  onClose: () => void;
  initialMessages?: MessagePayload;
}) {
  const [sender, setSender] = useState("Dashboard");
  const [message, setMessage] = useState("");
  const [sendAt, setSendAt] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MessagePayload | undefined>(initialMessages);

  const visibleMessages = useMemo(() => {
    const items = messages?.pending?.length ? messages.pending : messages?.messages ?? [];
    return items.slice(0, 10);
  }, [messages]);

  useEffect(() => {
    if (open) {
      setMessages(initialMessages);
      void refreshMessages();
    }
  }, [initialMessages, open]);

  async function refreshMessages() {
    const response = await fetch("/api/lulu/messages", { cache: "no-store" });
    if (!response.ok) return;
    setMessages(await response.json());
  }

  async function submit(sendNow: boolean) {
    setLoading(true);
    setStatus("");
    try {
      const body = {
        sender: sender.trim() || "Dashboard",
        message: message.trim(),
        sendAt: sendNow ? "" : sendAt,
        source: "dashboard"
      };
      if (!body.message) throw new Error("Type a message first.");
      if (!sendNow && !body.sendAt) throw new Error("Choose a send time or use send now.");

      const response = await fetch("/api/lulu/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail ?? "Message failed");
      setMessages(data);
      setMessage("");
      setSendAt("");
      setStatus(sendNow ? "Message sent to LULU." : "Message scheduled.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Message failed");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-white/15 bg-[#efeae2] shadow-2xl">
        <div className="flex items-center justify-between bg-[#075e54] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25d366] text-[#073b33]">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Message LULU</h2>
              <p className="text-xs text-white/75">{messages?.pendingCount ?? 0} pending messages</p>
            </div>
          </div>
          <button className="rounded-md p-2 text-white/80 hover:bg-white/10 hover:text-white" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(37,211,102,0.18),transparent_32%),linear-gradient(180deg,#efeae2,#e8ddd2)] p-3 thin-scrollbar">
          {visibleMessages.length > 0 ? (
            visibleMessages.map((item) => (
              <div key={item.id} className="ml-auto max-w-[86%] rounded-lg rounded-tr-sm bg-[#dcf8c6] px-3 py-2 text-sm text-slate-900 shadow">
                <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase text-emerald-900/80">
                  <span>{item.sender}</span>
                  <span className={cn(item.status === "read" ? "text-slate-500" : "animate-pulse text-pink-700")}>{item.status}</span>
                </div>
                <p className="break-words leading-relaxed">{item.message}</p>
                <p className="mt-1 text-right text-[11px] text-slate-500">{new Date(item.sendAt).toLocaleString()}</p>
              </div>
            ))
          ) : (
            <div className="mx-auto my-8 w-fit rounded-full bg-white/80 px-4 py-2 text-xs text-slate-600 shadow">No pending messages</div>
          )}
        </div>

        <div className="space-y-3 bg-[#f0f2f5] p-3">
          <input
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
            onChange={(event) => setSender(event.target.value)}
            placeholder="Your name"
            value={sender}
          />
          <textarea
            className="min-h-24 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500"
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Type a message"
            value={message}
          />
          <input
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
            onChange={(event) => setSendAt(event.target.value)}
            type="datetime-local"
            value={sendAt}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button className="bg-[#25d366] text-[#073b33] hover:bg-[#1fc15b]" disabled={loading} onClick={() => submit(true)}>
              <Send className="h-4 w-4" />
              Send now
            </Button>
            <Button className="bg-[#075e54] text-white hover:bg-[#064b43]" disabled={loading} onClick={() => submit(false)}>
              Schedule
            </Button>
          </div>
          <p className="min-h-4 text-xs text-slate-600">{status || "LULU will blink and announce new due messages."}</p>
        </div>
      </div>
    </div>
  );
}
