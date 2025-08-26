"use client";

import { useEffect, useRef, useState } from "react";
import { connectChat } from "@/lib/twitch/chat";

type Msg = { id: string; user: string; text: string; color?: string };

export default function TwitchChat({ channel }: { channel: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const clientRef = useRef<any>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const username = process.env.NEXT_PUBLIC_TWITCH_CHAT_USERNAME || process.env.TWITCH_CHAT_USERNAME;
  const oauth = process.env.NEXT_PUBLIC_TWITCH_CHAT_OAUTH || process.env.TWITCH_CHAT_OAUTH;
  const canSend = !!username && !!oauth;

  useEffect(() => {
    const client = connectChat({ channel, username, oauth });
    clientRef.current = client;
    client.on("message", (_: string, tags: any, msg: string, self: boolean) => {
      if (self) return;
      setMessages((m) => [
        ...m.slice(-100),
        {
          id: tags.id || Date.now().toString(),
          user: tags["display-name"] || tags.username || "",
          text: msg,
          color: tags.color,
        },
      ]);
    });
    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [channel, username, oauth]);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientRef.current || !input) return;
    clientRef.current.say(channel, input);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col text-sm text-text">
      <div ref={listRef} className="flex-1 space-y-1 overflow-y-auto p-2">
        {messages.map((m) => (
          <div key={m.id}>
            <span className="font-semibold" style={{ color: m.color }}>
              {m.user}: 
            </span>
            <span>{m.text}</span>
          </div>
        ))}
      </div>
      {canSend && (
        <form onSubmit={onSubmit} className="flex gap-2 border-t border-white/5 p-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded bg-surface p-1"
            placeholder="Send a message"
          />
          <button type="submit" className="rounded bg-surface px-2">
            Send
          </button>
        </form>
      )}
    </div>
  );
}

