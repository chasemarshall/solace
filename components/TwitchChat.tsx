"use client";

import { useEffect, useState } from "react";

type Msg = { id: string; user: string; text: string };

export default function TwitchChat({ channel }: { channel: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);

  useEffect(() => {
    let client: any;
    function init() {
      const tmi = (window as any).tmi;
      if (!tmi) return;
      client = new tmi.Client({ channels: [channel] });
      client.connect();
      client.on("message", (_: string, tags: any, msg: string, self: boolean) => {
        if (self) return;
        setMessages((m) => [
          ...m.slice(-100),
          { id: tags.id || Date.now().toString(), user: tags["display-name"] || tags.username || "", text: msg },
        ]);
      });
    }
    if (!(window as any).tmi) {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/tmi.js@1.8.5/dist/tmi.min.js";
      s.onload = init;
      document.body.appendChild(s);
    } else {
      init();
    }
    return () => {
      client?.disconnect();
    };
  }, [channel]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-2 text-sm space-y-1">
        {messages.map((m) => (
          <div key={m.id}>
            <span className="font-semibold">{m.user}: </span>
            <span>{m.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

