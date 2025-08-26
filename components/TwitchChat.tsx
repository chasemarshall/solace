"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { connectChat } from "@/lib/twitch/chat";

type Badge = {
  setID: string;
  version: string;
  imageUrl1x: string;
  imageUrl2x: string;
  imageUrl4x: string;
  title: string;
};

type Emote = {
  id: string;
  name: string;
  urls: {
    "1": string;
    "2": string;
    "4": string;
  };
  format?: string[];
  scale?: string[];
  theme_mode?: string[];
};

type Msg = {
  id: string;
  user: string;
  displayName: string;
  text: string;
  color?: string;
  badges: Badge[];
  emotes: { [key: string]: string[] };
  timestamp: Date;
  replyTo?: {
    id: string;
    user: string;
    displayName: string;
    message: string;
  };
  isMention: boolean;
};

export default function TwitchChat({ channel }: { channel: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<Msg | null>(null);
  const [bttvEmotes, setBttvEmotes] = useState<{ [key: string]: Emote }>({});
  const [ffzEmotes, setFfzEmotes] = useState<{ [key: string]: Emote }>({});
  const [channelId, setChannelId] = useState<string>("");
  
  const clientRef = useRef<any>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const username = process.env.NEXT_PUBLIC_TWITCH_CHAT_USERNAME || process.env.TWITCH_CHAT_USERNAME;
  const oauth = process.env.NEXT_PUBLIC_TWITCH_CHAT_OAUTH || process.env.TWITCH_CHAT_OAUTH;
  const canSend = !!username && !!oauth;

  // Fetch BTTV emotes
  const fetchBttvEmotes = useCallback(async (channelName: string, roomId?: string) => {
    try {
      // Global BTTV emotes
      const globalRes = await fetch("https://api.betterttv.net/3/cached/emotes/global");
      const globalEmotes = await globalRes.json();
      
      let channelEmotes: any[] = [];
      if (roomId) {
        try {
          const channelRes = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${roomId}`);
          const channelData = await channelRes.json();
          channelEmotes = [...(channelData.channelEmotes || []), ...(channelData.sharedEmotes || [])];
        } catch (e) {
          console.log("No BTTV channel emotes found");
        }
      }

      const allBttvEmotes: { [key: string]: Emote } = {};
      [...globalEmotes, ...channelEmotes].forEach((emote: any) => {
        allBttvEmotes[emote.code] = {
          id: emote.id,
          name: emote.code,
          urls: {
            "1": `https://cdn.betterttv.net/emote/${emote.id}/1x`,
            "2": `https://cdn.betterttv.net/emote/${emote.id}/2x`,
            "4": `https://cdn.betterttv.net/emote/${emote.id}/3x`,
          }
        };
      });
      
      setBttvEmotes(allBttvEmotes);
    } catch (e) {
      console.error("Failed to fetch BTTV emotes:", e);
    }
  }, []);

  // Fetch FFZ emotes
  const fetchFfzEmotes = useCallback(async (channelName: string, roomId?: string) => {
    try {
      // Global FFZ emotes
      const globalRes = await fetch("https://api.frankerfacez.com/v1/set/global");
      const globalData = await globalRes.json();
      
      let channelData: any = null;
      if (roomId) {
        try {
          const channelRes = await fetch(`https://api.frankerfacez.com/v1/room/${channelName}`);
          channelData = await channelRes.json();
        } catch (e) {
          console.log("No FFZ channel emotes found");
        }
      }

      const allFfzEmotes: { [key: string]: Emote } = {};
      
      // Add global emotes
      Object.values(globalData.sets || {}).forEach((set: any) => {
        Object.values(set.emoticons || {}).forEach((emote: any) => {
          allFfzEmotes[emote.name] = {
            id: emote.id.toString(),
            name: emote.name,
            urls: {
              "1": `https:${emote.urls["1"]}`,
              "2": `https:${emote.urls["2"] || emote.urls["1"]}`,
              "4": `https:${emote.urls["4"] || emote.urls["2"] || emote.urls["1"]}`,
            }
          };
        });
      });

      // Add channel emotes
      if (channelData?.sets) {
        Object.values(channelData.sets).forEach((set: any) => {
          Object.values(set.emoticons || {}).forEach((emote: any) => {
            allFfzEmotes[emote.name] = {
              id: emote.id.toString(),
              name: emote.name,
              urls: {
                "1": `https:${emote.urls["1"]}`,
                "2": `https:${emote.urls["2"] || emote.urls["1"]}`,
                "4": `https:${emote.urls["4"] || emote.urls["2"] || emote.urls["1"]}`,
              }
            };
          });
        });
      }
      
      setFfzEmotes(allFfzEmotes);
    } catch (e) {
      console.error("Failed to fetch FFZ emotes:", e);
    }
  }, []);

  // Get channel ID for emote fetching
  useEffect(() => {
    const fetchChannelId = async () => {
      try {
        const res = await fetch(`/api/channel/${channel}`);
        const data = await res.json();
        if (data.user?.id) {
          setChannelId(data.user.id);
          fetchBttvEmotes(channel, data.user.id);
          fetchFfzEmotes(channel, data.user.id);
        }
      } catch (e) {
        console.error("Failed to fetch channel ID:", e);
        fetchBttvEmotes(channel);
        fetchFfzEmotes(channel);
      }
    };
    fetchChannelId();
  }, [channel, fetchBttvEmotes, fetchFfzEmotes]);

  useEffect(() => {
    const client = connectChat({ channel, username, oauth });
    clientRef.current = client;
    
    client.on("message", (_: string, tags: any, msg: string, self: boolean) => {
      if (self) return;
      
      const badges: Badge[] = [];
      if (tags.badges) {
        Object.entries(tags.badges).forEach(([setID, version]: [string, any]) => {
          // Common badge mappings
          const badgeMap: { [key: string]: string } = {
            broadcaster: "🔴",
            moderator: "⚔️",
            subscriber: "⭐",
            vip: "💎",
            premium: "👑",
            turbo: "⚡"
          };
          
          badges.push({
            setID,
            version: version.toString(),
            imageUrl1x: `https://static-cdn.jtvnw.net/badges/v1/${setID}/${version}/1`,
            imageUrl2x: `https://static-cdn.jtvnw.net/badges/v1/${setID}/${version}/2`,
            imageUrl4x: `https://static-cdn.jtvnw.net/badges/v1/${setID}/${version}/3`,
            title: badgeMap[setID] || setID
          });
        });
      }

      // Check for reply
      let replyTo = undefined;
      if (tags["reply-parent-msg-id"]) {
        replyTo = {
          id: tags["reply-parent-msg-id"],
          user: tags["reply-parent-user-login"] || "",
          displayName: tags["reply-parent-display-name"] || "",
          message: tags["reply-parent-msg-body"] || ""
        };
      }

      // Check if message mentions the current user
      const isMention = Boolean(username && msg.toLowerCase().includes(`@${username.toLowerCase()}`));

      setMessages((m) => [
        ...m.slice(-99), // Keep last 99 messages for performance
        {
          id: tags.id || Date.now().toString(),
          user: tags.username || "",
          displayName: tags["display-name"] || tags.username || "",
          text: msg,
          color: tags.color,
          badges,
          emotes: tags.emotes || {},
          timestamp: new Date(),
          replyTo,
          isMention
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

  // Parse message with emotes
  const parseMessage = useCallback((message: Msg) => {
    let text = message.text;
    const parts: Array<{ type: 'text' | 'emote'; content: string; emoteUrl?: string; emoteName?: string }> = [];
    
    // Handle Twitch emotes first
    const twitchEmoteRanges: Array<{ start: number; end: number; id: string }> = [];
    Object.entries(message.emotes).forEach(([emoteId, ranges]) => {
      ranges.forEach((range: string) => {
        const [start, end] = range.split('-').map(Number);
        twitchEmoteRanges.push({ start, end, id: emoteId });
      });
    });
    
    // Sort by start position (reverse to replace from end to start)
    twitchEmoteRanges.sort((a, b) => b.start - a.start);
    
    // Replace Twitch emotes
    twitchEmoteRanges.forEach(({ start, end, id }) => {
      const emoteName = text.substring(start, end + 1);
      const before = text.substring(0, start);
      const after = text.substring(end + 1);
      text = before + `__TWITCH_EMOTE_${id}_${emoteName}__` + after;
    });

    // Split text into words and check for BTTV/FFZ emotes
    const words = text.split(' ');
    words.forEach((word, index) => {
      if (word.startsWith('__TWITCH_EMOTE_')) {
        const match = word.match(/__TWITCH_EMOTE_(\d+)_(.+)__/);
        if (match) {
          const [, emoteId, emoteName] = match;
          parts.push({
            type: 'emote',
            content: emoteName,
            emoteUrl: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0`,
            emoteName
          });
        }
      } else if (bttvEmotes[word]) {
        parts.push({
          type: 'emote',
          content: word,
          emoteUrl: bttvEmotes[word].urls["1"],
          emoteName: word
        });
      } else if (ffzEmotes[word]) {
        parts.push({
          type: 'emote',
          content: word,
          emoteUrl: ffzEmotes[word].urls["1"],
          emoteName: word
        });
      } else {
        // Handle mentions
        if (word.startsWith('@') && word.length > 1) {
          parts.push({
            type: 'text',
            content: word
          });
        } else {
          parts.push({
            type: 'text',
            content: word
          });
        }
      }
      
      // Add space between words (except for last word)
      if (index < words.length - 1) {
        parts.push({ type: 'text', content: ' ' });
      }
    });

    return parts;
  }, [bttvEmotes, ffzEmotes]);

  const handleReply = (message: Msg) => {
    setReplyingTo(message);
    setInput(`@${message.displayName} `);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setInput("");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientRef.current || !input.trim()) return;
    
    let messageToSend = input.trim();
    if (replyingTo) {
      // Twitch reply format
      messageToSend = `@${replyingTo.displayName} ${messageToSend}`;
    }
    
    clientRef.current.say(channel, messageToSend);
    setInput("");
    setReplyingTo(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      <div className="border-b border-white/10 p-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500"></div>
          <span className="text-sm font-medium">LIVE CHAT</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
        <div className="space-y-1 p-2">
          {messages.map((m) => {
            const messageParts = parseMessage(m);
            return (
              <div 
                key={m.id} 
                className={`group relative rounded-lg p-2 transition-colors hover:bg-white/5 ${
                  m.isMention ? 'bg-purple-500/20 border-l-2 border-purple-500' : ''
                }`}
              >
                {/* Reply indicator */}
                {m.replyTo && (
                  <div className="mb-1 flex items-center gap-1 text-xs text-text-muted">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 8l3.707-3.707a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>replying to</span>
                    <span className="font-medium" style={{ color: m.replyTo.user === channel ? '#9146ff' : undefined }}>
                      {m.replyTo.displayName}
                    </span>
                    <span className="truncate max-w-32">
                      {m.replyTo.message.length > 30 ? `${m.replyTo.message.substring(0, 30)}...` : m.replyTo.message}
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  {/* Timestamp */}
                  <span className="mt-0.5 text-xs text-text-muted opacity-0 transition-opacity group-hover:opacity-100">
                    {formatTime(m.timestamp)}
                  </span>

                  {/* Message content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {/* Badges */}
                      {m.badges.map((badge, idx) => (
                        <span
                          key={`${badge.setID}-${badge.version}-${idx}`}
                          className="text-xs"
                          title={badge.title}
                        >
                          {badge.title}
                        </span>
                      ))}

                      {/* Username */}
                      <span 
                        className="font-semibold cursor-pointer hover:underline" 
                        style={{ color: m.color || '#ffffff' }}
                        onClick={() => handleReply(m)}
                        title="Click to reply"
                      >
                        {m.displayName}
                      </span>
                    </div>

                    {/* Message text with emotes */}
                    <div className="mt-1 flex flex-wrap items-center gap-1 leading-relaxed">
                      {messageParts.map((part, idx) => {
                        if (part.type === 'emote' && part.emoteUrl) {
                          return (
                            <span
                              key={idx}
                              className="inline-block h-7 w-7 bg-cover bg-center bg-no-repeat align-middle"
                              style={{ backgroundImage: `url(${part.emoteUrl})` }}
                              title={part.emoteName || part.content}
                            />
                          );
                        } else {
                          // Handle mentions highlighting
                          if (part.content.startsWith('@')) {
                            return (
                              <span key={idx} className="text-purple-400 hover:text-purple-300">
                                {part.content}
                              </span>
                            );
                          }
                          return <span key={idx}>{part.content}</span>;
                        }
                      })}
                    </div>
                  </div>

                  {/* Reply button */}
                  <button
                    onClick={() => handleReply(m)}
                    className="opacity-0 transition-opacity group-hover:opacity-100 rounded p-1 hover:bg-white/10"
                    title="Reply"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Input section */}
      {canSend && (
        <div className="border-t border-white/10">
          {/* Reply indicator */}
          {replyingTo && (
            <div className="flex items-center justify-between bg-white/5 p-2 text-xs">
              <div className="flex items-center gap-2 text-text-muted">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 8l3.707-3.707a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Replying to</span>
                <span className="font-medium" style={{ color: replyingTo.color || '#ffffff' }}>
                  {replyingTo.displayName}
                </span>
              </div>
              <button
                onClick={cancelReply}
                className="rounded hover:bg-white/10 p-1"
                title="Cancel reply"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Input form */}
          <form onSubmit={onSubmit} className="flex gap-2 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-lg bg-bg px-3 py-2 text-sm outline-none ring-purple-500/50 focus:ring-1 placeholder:text-text-muted"
              placeholder={replyingTo ? `Reply to ${replyingTo.displayName}...` : "Send a message..."}
              maxLength={500}
            />
            <button 
              type="submit" 
              disabled={!input.trim()}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
