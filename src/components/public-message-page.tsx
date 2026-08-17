"use client";

import { Cookie, MessageCircle, Send } from "lucide-react";
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
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
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
      if (!cleanName) throw new Error("Please enter your name.");
      if (!cleanMessage) throw new Error("Please type a message.");

      const response = await fetch("/api/lulu/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: cleanName, message: cleanMessage, source: "public" })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail ?? "Message failed");

      const entry = { id: data.message?.id ?? crypto.randomUUID(), sender: cleanName, message: cleanMessage, sentAt: new Date().toISOString() };
      if (cookieOk) {
        const nextHistory = [entry, ...history].slice(0, 8);
        setHistory(nextHistory);
        setCookie(historyCookie, JSON.stringify(nextHistory));
      }
      setMessage("");
      setStatus("Sent. LULU will blink and tell Jeremiah there is a message from you.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Message failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fb71c8_0%,#22d3ee_36%,#fde047_68%,#22c55e_100%)] px-4 py-8 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_25rem]">
        <div className="space-y-5">
          <a className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-semibold shadow" href="#message">
            <MessageCircle className="h-4 w-4 text-pink-600" />
            Message LULU
          </a>
          <div>
            <h1 className="text-4xl font-black tracking-normal text-white drop-shadow sm:text-6xl">Send Jeremiah a sweet note</h1>
            <p className="mt-4 max-w-xl text-lg font-medium text-white/95 drop-shadow">Type your name and message. LULU will glow, announce you, and keep the message ready to read.</p>
          </div>
          <img alt="Lovely teddy for LULU messages" className="h-auto w-64 max-w-full rounded-lg bg-white/60 p-4 shadow-xl" src="/teddy-message.svg" />
        </div>

        <div id="message" className="overflow-hidden rounded-lg border border-white/40 bg-[#efeae2] shadow-2xl">
          <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25d366] text-[#073b33]">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Message Jeremiah</h2>
              <p className="text-xs text-white/75">Powered by LULU</p>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <input className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500" onChange={(event) => setName(event.target.value)} placeholder="Your name" value={name} />
            <textarea className="min-h-36 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500" onChange={(event) => setMessage(event.target.value)} placeholder="Type your message" value={message} />
            <Button className="h-11 w-full bg-[#25d366] text-[#073b33] hover:bg-[#1fc15b]" disabled={sending} onClick={sendMessage}>
              <Send className="h-4 w-4" />
              Send message
            </Button>
            <p className="min-h-5 text-sm font-medium text-slate-700">{status}</p>
          </div>

          {history.length > 0 ? (
            <div className="border-t border-slate-300/70 bg-white/50 p-4">
              <p className="mb-2 text-xs font-bold uppercase text-slate-600">Your sent messages</p>
              <div className="space-y-2">
                {history.map((item) => (
                  <div className="rounded-md bg-[#dcf8c6] px-3 py-2 text-sm shadow" key={item.id}>
                    <p className="break-words text-slate-900">{item.message}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{new Date(item.sentAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {!cookieOk ? (
        <div className="fixed inset-x-3 bottom-3 mx-auto flex max-w-3xl flex-col gap-3 rounded-lg border border-white/50 bg-white p-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Cookie className="mt-0.5 h-5 w-5 text-pink-600" />
            <p className="text-sm text-slate-700">This page can use cookies to remember the messages you sent after refresh.</p>
          </div>
          <Button className="bg-pink-500 text-white hover:bg-pink-400" onClick={acceptCookies}>Allow cookies</Button>
        </div>
      ) : null}
    </main>
  );
}
