"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { connectChat } from "@/lib/twitch/chat";

type Badge = {
  setID: string;
  version: string;
  emoji: string;
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
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const clientRef = useRef<any>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const username = process.env.NEXT_PUBLIC_TWITCH_CHAT_USERNAME || process.env.TWITCH_CHAT_USERNAME;
  const oauth = process.env.NEXT_PUBLIC_TWITCH_CHAT_OAUTH || process.env.TWITCH_CHAT_OAUTH;
  const canSend = !!username && !!oauth;

  // Enhanced user color - make colors more vibrant
  const enhanceUserColor = (color?: string) => {
    if (!color) return '#e0e6ed';
    
    // Brighten dark colors
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // If color is too dark, brighten it
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    if (brightness < 120) {
      const factor = 1.8;
      return `rgb(${Math.min(255, r * factor)}, ${Math.min(255, g * factor)}, ${Math.min(255, b * factor)})`;
    }
    
    return color;
  };

  // Enhanced badge mapping with more emojis
  const getBadgeEmoji = (setID: string, version: string): string | null => {
    const badgeMap: { [key: string]: { [version: string]: string } | string } = {
      broadcaster: "👑",
      moderator: "🗡️",
      subscriber: "⭐",
      vip: "💎",
      premium: "💜",
      turbo: "⚡",
      staff: "🛡️",
      admin: "👨‍💼",
      global_mod: "🌐",
      founder: "🏆",
      artist: "🎨",
      partner: "✅",
      verified: "✔️",
      bits: "💰",
      "bits-leader": "🥇",
      "sub-gifter": "🎁",
      "moments": "📸",
      "clip-champ": "🏅"
    };

    const badge = badgeMap[setID];
    if (typeof badge === 'string') return badge;
    if (typeof badge === 'object' && badge[version]) return badge[version];
    
    // Default subscriber tiers
    if (setID === 'subscriber') {
      const months = parseInt(version) || 0;
      if (months >= 24) return "⭐⭐⭐";
      if (months >= 12) return "⭐⭐";
      return "⭐";
    }
    
    return null;
  };

  // Fetch BTTV emotes
  const fetchBttvEmotes = useCallback(async (channelName: string, roomId?: string) => {
    try {
      // Always fetch global emotes
      const globalRes = await fetch("https://api.betterttv.net/3/cached/emotes/global");
      const globalEmotes = await globalRes.json();

      const allBttvEmotes: { [key: string]: Emote } = {};
      
      // Add global emotes
      globalEmotes.forEach((emote: any) => {
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

      // Try to fetch channel-specific emotes if we have the room ID
      if (roomId) {
        try {
          const channelRes = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${roomId}`);
          if (channelRes.ok) {
            const channelData = await channelRes.json();
            [...(channelData.channelEmotes || []), ...(channelData.sharedEmotes || [])].forEach((emote: any) => {
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
          }
        } catch (e) {
          console.log("No BTTV channel emotes found for", channelName);
        }
      }
      
      setBttvEmotes(allBttvEmotes);
      console.log(`Loaded ${Object.keys(allBttvEmotes).length} BTTV emotes`);
    } catch (e) {
      console.error("Failed to fetch BTTV emotes:", e);
    }
  }, []);

  // Fetch FFZ emotes
  const fetchFfzEmotes = useCallback(async (channelName: string) => {
    try {
      // Always fetch global emotes
      const globalRes = await fetch("https://api.frankerfacez.com/v1/set/global");
      const globalData = await globalRes.json();

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

      // Try to fetch channel-specific emotes
      try {
        const channelRes = await fetch(`https://api.frankerfacez.com/v1/room/${channelName}`);
        if (channelRes.ok) {
          const channelData = await channelRes.json();
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
        }
      } catch (e) {
        console.log("No FFZ channel emotes found for", channelName);
      }
      
      setFfzEmotes(allFfzEmotes);
      console.log(`Loaded ${Object.keys(allFfzEmotes).length} FFZ emotes`);
    } catch (e) {
      console.error("Failed to fetch FFZ emotes:", e);
    }
  }, []);

  // Get channel ID and load emotes
  useEffect(() => {
    const fetchChannelData = async () => {
      try {
        const res = await fetch(`/api/channel/${channel}`);
        if (res.ok) {
          const data = await res.json();
          const userId = data.user?.id;
          setChannelId(userId || "");
          
          // Load emotes with proper IDs
          await Promise.all([
            fetchBttvEmotes(channel, userId),
            fetchFfzEmotes(channel)
          ]);
        }
      } catch (e) {
        console.error("Failed to fetch channel data:", e);
        // Fallback: load global emotes only
        await Promise.all([
          fetchBttvEmotes(channel),
          fetchFfzEmotes(channel)
        ]);
      }
    };
    
    fetchChannelData();
  }, [channel, fetchBttvEmotes, fetchFfzEmotes]);

  useEffect(() => {
    const client = connectChat({ channel, username, oauth });
    clientRef.current = client;
    
    client.on("message", (_: string, tags: any, msg: string, self: boolean) => {
      if (self) return;
      
      const badges: Badge[] = [];
      if (tags.badges) {
        Object.entries(tags.badges).forEach(([setID, version]: [string, any]) => {
          const emoji = getBadgeEmoji(setID, version.toString());
          if (emoji) {
            badges.push({
              setID,
              version: version.toString(),
              emoji,
              title: setID
            });
          }
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
        ...m.slice(-99),
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
    if (el && isAutoScrolling) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isAutoScrolling]);

  // Handle scroll detection
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      
      if (!isNearBottom && isAutoScrolling) {
        setIsAutoScrolling(false);
        setShowScrollButton(true);
      } else if (isNearBottom && !isAutoScrolling) {
        setIsAutoScrolling(true);
        setShowScrollButton(false);
      }
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [isAutoScrolling]);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      setIsAutoScrolling(true);
      setShowScrollButton(false);
    }
  };

  // Parse message with emotes
  const parseMessage = useCallback((message: Msg) => {
    let text = message.text;
    
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
    
    // Replace Twitch emotes with placeholders
    twitchEmoteRanges.forEach(({ start, end, id }) => {
      const emoteName = text.substring(start, end + 1);
      const before = text.substring(0, start);
      const after = text.substring(end + 1);
      text = before + ` __TWITCH_${id}__ ` + after;
    });

    // Split by spaces but preserve the structure
    const words = text.split(' ');
    const parts: Array<{ type: 'text' | 'emote'; content: string; emoteUrl?: string }> = [];
    
    words.forEach((word, index) => {
      if (word.trim() === '') {
        // Skip empty strings but preserve single spaces
        if (index < words.length - 1) {
          parts.push({ type: 'text', content: ' ' });
        }
        return;
      }

      if (word.startsWith('__TWITCH_') && word.endsWith('__')) {
        const emoteId = word.match(/__TWITCH_(\d+)__/)?.[1];
        if (emoteId) {
          parts.push({
            type: 'emote',
            content: word,
            emoteUrl: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0`
          });
        }
      } else if (bttvEmotes[word]) {
        parts.push({
          type: 'emote',
          content: word,
          emoteUrl: bttvEmotes[word].urls["1"]
        });
      } else if (ffzEmotes[word]) {
        parts.push({
          type: 'emote',
          content: word,
          emoteUrl: ffzEmotes[word].urls["1"]
        });
      } else {
        parts.push({
          type: 'text',
          content: word
        });
      }
      
      // Add space after each word except the last
      if (index < words.length - 1) {
        parts.push({ type: 'text', content: ' ' });
      }
    });

    return parts;
  }, [bttvEmotes, ffzEmotes]);

  const handleReply = (message: Msg) => {
    if (!canSend) return;
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
      messageToSend = `@${replyingTo.displayName} ${messageToSend}`;
    }
    
    clientRef.current.say(channel, messageToSend);
    setInput("");
    setReplyingTo(null);
  };

  return (
    <div className="flex h-full flex-col bg-surface overflow-hidden rounded-xl">
      {/* Header */}
      <div className="bg-surface border-b border-white/10 p-3 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-sm font-bold text-white tracking-wide">LIVE CHAT</span>
          <div className="ml-auto text-xs text-text-muted">{messages.length} messages</div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={listRef} 
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.3) transparent'
        }}
      >
        <div className="p-1 space-y-0.5">
          {messages.map((m, msgIndex) => {
            const messageParts = parseMessage(m);
            
            // Check if this message is from same user as previous (for grouping)
            const prevMsg = messages[msgIndex - 1];
            const sameUser = prevMsg && prevMsg.user === m.user && 
              (m.timestamp.getTime() - prevMsg.timestamp.getTime()) < 60000; // Within 1 minute
            
            return (
              <div 
                key={m.id} 
                className={`group relative px-3 py-1.5 transition-all duration-150 hover:bg-white/5 ${
                  m.isMention ? 'bg-purple-500/20 border-l-2 border-purple-400' : ''
                } flex items-start gap-2`}
              >
                <div className="flex-1 min-w-0">
                  {/* Reply indicator */}
                  {m.replyTo && (
                    <div className="mb-1 flex items-center gap-1.5 text-xs bg-white/5 rounded-md px-2 py-1 border-l-2 border-text-muted">
                      <svg className="h-3 w-3 text-text-muted" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 8l3.707-3.707a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-text-muted">replying to</span>
                      <span className="font-semibold text-white">
                        {m.replyTo.displayName}
                      </span>
                      <span className="truncate max-w-32 text-text-muted italic">
                        &quot;{m.replyTo.message.length > 25 ? `${m.replyTo.message.substring(0, 25)}...` : m.replyTo.message}&quot;
                      </span>
                    </div>
                  )}

                  {/* Username line (only show if not same user or has reply) */}
                  {(!sameUser || m.replyTo) && (
                    <div className="flex items-center gap-1.5">
                      {/* Badges */}
                      {m.badges.map((badge, idx) => (
                        <span
                          key={`${badge.setID}-${badge.version}-${idx}`}
                          className="text-sm leading-none"
                          title={`${badge.setID}`}
                        >
                          {badge.emoji}
                        </span>
                      ))}

                      {/* Username with inline message */}
                      <span 
                        className="font-bold cursor-pointer hover:underline transition-all duration-150 text-sm" 
                        style={{ color: enhanceUserColor(m.color) }}
                        onClick={() => handleReply(m)}
                        title="Click to reply"
                      >
                        {m.displayName}:
                      </span>
                      
                      {/* Message text inline with username */}
                      <span className="leading-relaxed text-text break-words text-sm">
                        {messageParts.map((part, idx) => {
                          if (part.type === 'emote' && part.emoteUrl) {
                            return (
                              <span
                                key={idx}
                                className="inline-block h-6 w-6 bg-cover bg-center bg-no-repeat align-middle mx-0.5"
                                style={{ backgroundImage: `url(${part.emoteUrl})` }}
                                title={part.content}
                              />
                            );
                          } else {
                            // Handle mentions highlighting
                            if (part.content.startsWith('@')) {
                              return (
                                <span key={idx} className="text-purple-300 font-semibold bg-purple-900/30 px-1 rounded">
                                  {part.content}
                                </span>
                              );
                            }
                            return <span key={idx}>{part.content}</span>;
                          }
                        })}
                      </span>
                    </div>
                  )}

                  {/* For grouped messages (same user), show message without username */}
                  {sameUser && !m.replyTo && (
                    <div className="leading-relaxed text-text break-words text-sm ml-6">
                      {messageParts.map((part, idx) => {
                        if (part.type === 'emote' && part.emoteUrl) {
                          return (
                            <span
                              key={idx}
                              className="inline-block h-6 w-6 bg-cover bg-center bg-no-repeat align-middle mx-0.5"
                              style={{ backgroundImage: `url(${part.emoteUrl})` }}
                              title={part.content}
                            />
                          );
                        } else {
                          // Handle mentions highlighting
                          if (part.content.startsWith('@')) {
                            return (
                              <span key={idx} className="text-purple-300 font-semibold bg-purple-900/30 px-1 rounded">
                                {part.content}
                              </span>
                            );
                          }
                          return <span key={idx}>{part.content}</span>;
                        }
                      })}
                    </div>
                  )}
                </div>

                {/* Reply button on the right */}
                {canSend && (
                  <button
                    onClick={() => handleReply(m)}
                    className="opacity-0 transition-all duration-200 group-hover:opacity-100 rounded-lg p-2 hover:bg-white/10 text-text-muted hover:text-white flex-shrink-0"
                    title="Reply to this message"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Input section */}
      <div className="border-t border-white/10 bg-surface rounded-b-xl">
        {/* Reply indicator */}
        {replyingTo && (
          <div className="flex items-center justify-between bg-white/5 p-3 text-xs">
            <div className="flex items-center gap-2 text-text-muted">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 8l3.707-3.707a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Replying to</span>
              <span className="font-bold text-white">
                {replyingTo.displayName}
              </span>
            </div>
            <button
              onClick={cancelReply}
              className="rounded-lg hover:bg-white/10 p-1.5 text-text-muted hover:text-white transition-colors"
              title="Cancel reply"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Input form */}
        {canSend ? (
          <form onSubmit={onSubmit} className="flex gap-3 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-lg bg-bg border border-white/20 px-4 py-2.5 text-sm text-white outline-none ring-purple-500/50 focus:ring-2 focus:border-purple-500/50 placeholder:text-text-muted transition-all duration-200"
              placeholder={replyingTo ? `Reply to ${replyingTo.displayName}...` : "Send a message..."}
              maxLength={500}
            />
            <button 
              type="submit" 
              disabled={!input.trim()}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-purple-500/25"
            >
              Send
            </button>
          </form>
        ) : (
          <div className="p-3 text-center">
            <div className="bg-bg border border-white/20 rounded-lg p-4">
              <p className="text-text font-medium">Please log in to chat</p>
              <p className="text-xs text-text-muted mt-1">We&apos;ll add the login feature soon!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
