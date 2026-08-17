"use client";

import { Cookie, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type SentMessage = {
  id: string;
  sender: string;
  message: string;
  sentAt: string;
};

const consentCookie = "lulu_message_cookie_ok";
const historyCookie = "lulu_public_messages";

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function setCookie(name: string, value: string, days = 180) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function readHistory(): SentMessage[] {
  const raw = getCookie(historyCookie);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function PublicMessagePage() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [cookieOk, setCookieOk] = useState(false);
  const [history, setHistory] = useState<SentMessage[]>([]);
  const [messageOpen, setMessageOpen] = useState(false);

  useEffect(() => {
    const accepted = getCookie(consentCookie) === "yes";
    setCookieOk(accepted);
    if (accepted) setHistory(readHistory());
  }, []);

  function acceptCookies() {
    setCookie(consentCookie, "yes");
    setCookieOk(true);
    setHistory(readHistory());
  }

  async function sendMessage() {
    setSending(true);
    setStatus("");
    try {
      const cleanName = name.trim();
      const cleanMessage = message.trim();
      if (!cleanName) throw new Error("Add your name.");
      if (!cleanMessage) throw new Error("Write a message.");

      const response = await fetch("/api/lulu/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: cleanName, message: cleanMessage, source: "public" })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail ?? "Message failed");

      const entry = {
        id: data.message?.id ?? crypto.randomUUID(),
        sender: cleanName,
        message: cleanMessage,
        sentAt: new Date().toISOString()
      };
      if (cookieOk) {
        const nextHistory = [entry, ...history].slice(0, 6);
        setHistory(nextHistory);
        setCookie(historyCookie, JSON.stringify(nextHistory));
      }
      setMessage("");
      setStatus("LULU will deliver your message in a sec.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Message failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="relative h-[100svh] overflow-hidden bg-[radial-gradient(circle_at_22%_16%,#fff7ad_0_13%,transparent_33%),linear-gradient(135deg,#fb71c8_0%,#22d3ee_38%,#fde047_70%,#22c55e_100%)] text-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <img alt="" aria-hidden="true" className="absolute left-5 top-16 h-14 w-14 animate-[luluTeddyFloat_4.8s_ease-in-out_infinite] opacity-75" src="/teddy-message.svg" />
        <img alt="" aria-hidden="true" className="absolute right-6 top-28 h-12 w-12 animate-[luluTeddyHop_3.8s_ease-in-out_infinite] opacity-70" src="/teddy-message.svg" />
        <img alt="" aria-hidden="true" className="absolute bottom-28 left-8 h-10 w-10 animate-[luluTeddyFloat_5.5s_ease-in-out_infinite] opacity-65" src="/teddy-message.svg" />
      </div>

      <section className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col items-center justify-center px-5 text-center">
        <div className="relative">
          <span className="absolute -left-8 top-8 h-5 w-5 rounded-full bg-white/75 shadow" />
          <span className="absolute -right-7 bottom-12 h-4 w-4 rounded-full bg-emerald-300/80 shadow" />
          <img alt="LULU teddy" className="mx-auto h-44 w-44 animate-[luluTeddyHop_4.2s_ease-in-out_infinite] rounded-lg bg-white/55 p-4 shadow-2xl sm:h-56 sm:w-56" src="/teddy-message.svg" />
        </div>

        <p className="mt-6 text-sm font-black uppercase tracking-normal text-white/90 drop-shadow">LULU Mail</p>
        <h1 className="mt-1 max-w-xs text-4xl font-black tracking-normal text-white drop-shadow sm:max-w-lg sm:text-6xl">
          Send Jeremiah love
        </h1>
        <p className="mt-3 max-w-xs text-base font-semibold text-white/95 drop-shadow sm:max-w-md sm:text-lg">
          LULU will deliver your message in a sec.
        </p>
      </section>

      <button
        aria-label="Open message form"
        className="absolute bottom-7 right-6 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-[#25d366] text-[#073b33] shadow-[0_18px_45px_rgba(7,59,51,0.28)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/80"
        onClick={() => setMessageOpen(true)}
        type="button"
      >
        <MessageCircle className="h-8 w-8" />
      </button>

      {messageOpen ? (
        <div className="absolute inset-0 z-30 flex items-end bg-slate-950/30 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
          <div className="max-h-[88svh] w-full max-w-md overflow-hidden rounded-lg border border-white/45 bg-[#efeae2] shadow-2xl">
            <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-[#073b33]">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <h2 className="truncate text-sm font-semibold">Message Jeremiah</h2>
                <p className="text-xs text-white/75">LULU is ready</p>
              </div>
              <button
                aria-label="Close message form"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                onClick={() => setMessageOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(88svh-4rem)] space-y-3 overflow-y-auto p-4 thin-scrollbar">
              <input
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                value={name}
              />
              <textarea
                className="min-h-32 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Sweet message"
                value={message}
              />
              <Button className="h-11 w-full bg-[#25d366] text-[#073b33] hover:bg-[#1fc15b]" disabled={sending} onClick={sendMessage}>
                <Send className="h-4 w-4" />
                Send
              </Button>
              <p className="min-h-5 text-sm font-semibold text-slate-700">{status}</p>

              {history.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {history.map((item) => (
                    <div className="ml-auto max-w-[88%] rounded-md bg-[#dcf8c6] px-3 py-2 text-left text-sm shadow" key={item.id}>
                      <p className="break-words text-slate-900">{item.message}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{new Date(item.sentAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {!cookieOk ? (
        <div className="absolute inset-x-3 bottom-24 z-20 mx-auto flex max-w-sm items-center gap-3 rounded-lg border border-white/55 bg-white/95 p-3 shadow-2xl">
          <Cookie className="h-5 w-5 shrink-0 text-pink-600" />
          <p className="min-w-0 flex-1 text-xs font-medium text-slate-700">Remember sent notes?</p>
          <Button className="h-8 bg-pink-500 px-3 text-xs text-white hover:bg-pink-400" onClick={acceptCookies}>Allow</Button>
        </div>
      ) : null}
    </main>
  );
}
