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

export default function TwitchChat({ channel, playerMode = "basic" }: { channel: string; playerMode?: "basic" | "enhanced" }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [replyingTo, setReplyingTo] = useState<Msg | null>(null);
  const [bttvEmotes, setBttvEmotes] = useState<{ [key: string]: Emote }>({});
  const [ffzEmotes, setFfzEmotes] = useState<{ [key: string]: Emote }>({});
  const [channelId, setChannelId] = useState<string>("");
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isLive, setIsLive] = useState<boolean | null>(null);
  
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

  // Enhanced badge mapping with more emojis and descriptions
  const getBadgeInfo = (setID: string, version: string): { emoji: string; title: string; description: string } => {
    const badgeMap: { [key: string]: { emoji: string; title: string; description: string } } = {
      broadcaster: {
        emoji: "👑",
        title: "Broadcaster",
        description: "The channel owner"
      },
      moderator: {
        emoji: "🗡️",
        title: "Moderator",
        description: "Channel moderator"
      },
      subscriber: {
        emoji: "⭐",
        title: "Subscriber",
        description: `Subscriber for ${version} months`
      },
      vip: {
        emoji: "💎",
        title: "VIP",
        description: "Very Important Person"
      },
      premium: {
        emoji: "💜",
        title: "Premium",
        description: "Twitch Premium subscriber"
      },
      turbo: {
        emoji: "⚡",
        title: "Turbo",
        description: "Twitch Turbo subscriber"
      },
      staff: {
        emoji: "🛡️",
        title: "Staff",
        description: "Twitch staff member"
      },
      admin: {
        emoji: "👨‍💼",
        title: "Admin",
        description: "Twitch administrator"
      },
      global_mod: {
        emoji: "🌐",
        title: "Global Moderator",
        description: "Global Twitch moderator"
      },
      founder: {
        emoji: "🏆",
        title: "Founder",
        description: "Channel founder"
      },
      artist: {
        emoji: "🎨",
        title: "Artist",
        description: "Verified artist"
      },
      partner: {
        emoji: "✅",
        title: "Partner",
        description: "Twitch partner"
      },
      verified: {
        emoji: "✔️",
        title: "Verified",
        description: "Verified account"
      },
      bits: {
        emoji: "💰",
        title: "Bits",
        description: "Bits leader"
      },
      "bits-leader": {
        emoji: "🥇",
        title: "Bits Leader",
        description: "Top bits contributor"
      },
      "sub-gifter": {
        emoji: "🎁",
        title: "Sub Gifter",
        description: "Gifted subscriptions"
      },
      "moments": {
        emoji: "📸",
        title: "Moments",
        description: "Featured in moments"
      },
      "clip-champ": {
        emoji: "🏅",
        title: "Clip Champion",
        description: "Top clip creator"
      }
    };

    const badge = badgeMap[setID];
    if (badge) {
      return badge;
    }
    
    // Default subscriber tiers
    if (setID === 'subscriber') {
      const months = parseInt(version) || 0;
      let emoji = "⭐";
      if (months >= 24) emoji = "⭐⭐⭐";
      else if (months >= 12) emoji = "⭐⭐";
      
      return {
        emoji,
        title: "Subscriber",
        description: `Subscriber for ${months} months`
      };
    }
    
    return {
      emoji: "🏷️",
      title: setID,
      description: "Custom badge"
    };
  };

  // Fetch BTTV emotes
  const fetchBttvEmotes = useCallback(async (channelName: string, roomId?: string) => {
    try {
      // Always fetch global emotes with timeout
      console.log("📡 Fetching BTTV global emotes...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      let globalRes: Response;
      try {
        globalRes = await fetch(
          "https://api.betterttv.net/3/cached/emotes/global",
          { signal: controller.signal }
        );
      } finally {
        clearTimeout(timeoutId);
      }
      
      if (!globalRes.ok) {
        throw new Error(`BTTV global API returned ${globalRes.status}`);
      }
      
      const globalEmotes = await globalRes.json();
      
      if (!Array.isArray(globalEmotes)) {
        throw new Error("BTTV global API returned invalid data format");
      }

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
      console.log(`✅ Loaded ${Object.keys(allBttvEmotes).length} BTTV emotes for ${channelName}`);
      if (Object.keys(allBttvEmotes).length > 0) {
        console.log("🎭 BTTV emotes:", Object.keys(allBttvEmotes).slice(0, 5).join(', '), '...');
      }
    } catch (e) {
      console.error("❌ Failed to fetch BTTV emotes:", e);
      setBttvEmotes({});
    }
  }, []);

  // Fetch FFZ emotes
  const fetchFfzEmotes = useCallback(async (channelName: string) => {
    try {
      // Always fetch global emotes with timeout
      console.log("📡 Fetching FFZ global emotes...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      let globalRes: Response;
      try {
        globalRes = await fetch(
          "https://api.frankerfacez.com/v1/set/global",
          { signal: controller.signal }
        );
      } finally {
        clearTimeout(timeoutId);
      }
      
      if (!globalRes.ok) {
        throw new Error(`FFZ global API returned ${globalRes.status}`);
      }
      
      const globalData = await globalRes.json();
      
      if (!globalData.sets) {
        throw new Error("FFZ global API returned invalid data format");
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
        } else if (channelRes.status === 404) {
          console.log(`FFZ: No channel emotes found for ${channelName}`);
        } else {
          console.warn(`FFZ channel emotes failed with status ${channelRes.status} for ${channelName}`);
        }
      } catch (e) {
        console.log("FFZ channel emotes request failed for", channelName, e);
      }
      
      setFfzEmotes(allFfzEmotes);
      console.log(`✅ Loaded ${Object.keys(allFfzEmotes).length} FFZ emotes for ${channelName}`);
      if (Object.keys(allFfzEmotes).length > 0) {
        console.log("🐸 FFZ emotes:", Object.keys(allFfzEmotes).slice(0, 5).join(', '), '...');
      }
    } catch (e) {
      console.error("❌ Failed to fetch FFZ emotes:", e);
      setFfzEmotes({});
    }
  }, []);

  // Get channel ID and load emotes (only in enhanced mode)
  useEffect(() => {
    if (playerMode !== "enhanced") {
      console.log("Basic mode: Skipping BTTV/FFZ emote loading");
      return;
    }

    const fetchChannelData = async () => {
      try {
        console.log(`📡 Fetching channel data for: ${channel}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        let res: Response;
        try {
          res = await fetch(
            `/api/channel/${channel}`,
            { signal: controller.signal }
          );
        } finally {
          clearTimeout(timeoutId);
        }
        
        if (res.ok) {
          const data = await res.json();
          const userId = data.user?.id;
          setChannelId(userId || "");
          setIsLive(data.liveStream !== null);
          console.log(`✅ Channel ID for ${channel}: ${userId || 'not found'}`);
          console.log(`📺 Live status for ${channel}: ${data.liveStream ? 'LIVE' : 'OFFLINE'}`);
          
          // Load emotes with proper IDs
          await Promise.all([
            fetchBttvEmotes(channel, userId),
            fetchFfzEmotes(channel)
          ]);
        } else {
          console.warn(`⚠️ Channel API returned ${res.status}, loading global emotes only`);
          throw new Error(`Channel API returned ${res.status}`);
        }
      } catch (e) {
        console.error("❌ Failed to fetch channel data:", e);
        setIsLive(false);
        // Fallback: load global emotes only
        console.log("🔄 Falling back to global emotes only");
        await Promise.all([
          fetchBttvEmotes(channel),
          fetchFfzEmotes(channel)
        ]);
      }
    };
    
    fetchChannelData();
  }, [channel, fetchBttvEmotes, fetchFfzEmotes, playerMode]);

  useEffect(() => {
    const client = connectChat({ channel, username, oauth });
    clientRef.current = client;
    
    client.on("message", (_: string, tags: any, msg: string, self: boolean) => {
      if (self) return;
      
      const badges: Badge[] = [];
      if (tags.badges) {
        Object.entries(tags.badges).forEach(([setID, version]: [string, any]) => {
          const { emoji, title, description } = getBadgeInfo(setID, version.toString());
          badges.push({
            setID,
            version: version.toString(),
            emoji,
            title
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

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 30;
      
      // Clear previous timeout
      clearTimeout(scrollTimeout);
      
      // If user scrolled up from bottom, pause auto-scrolling immediately
      if (!isNearBottom && isAutoScrolling) {
        setIsAutoScrolling(false);
        setShowScrollButton(true);
      } 
      // If user scrolled back near bottom, resume auto-scrolling after a brief delay
      else if (isNearBottom && !isAutoScrolling) {
        scrollTimeout = setTimeout(() => {
          setIsAutoScrolling(true);
          setShowScrollButton(false);
        }, 500); // Brief delay to prevent flickering
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
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
          // Try the modern format first, with fallback
          const emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0`;
          parts.push({
            type: 'emote',
            content: word.replace(/__TWITCH_\d+__/, `twitch_emote_${emoteId}`),
            emoteUrl
          });
          console.log(`🎮 Twitch emote found: ID ${emoteId}, URL: ${emoteUrl}`);
        }
      } else if (bttvEmotes[word]) {
        const emoteUrl = bttvEmotes[word].urls["1"];
        parts.push({
          type: 'emote',
          content: word,
          emoteUrl
        });
        console.log(`🎭 BTTV emote found: ${word}, URL: ${emoteUrl}`);
      } else if (ffzEmotes[word]) {
        const emoteUrl = ffzEmotes[word].urls["1"];
        parts.push({
          type: 'emote',
          content: word,
          emoteUrl
        });
        console.log(`🐸 FFZ emote found: ${word}, URL: ${emoteUrl}`);
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
          <div className={`h-2 w-2 rounded-full ${isLive === true ? 'bg-red-500 animate-pulse' : isLive === false ? 'bg-gray-500' : 'bg-gray-500 animate-pulse'}`}></div>
          <span className="text-sm font-bold text-white tracking-wide">live chat</span>
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
                    <div className="text-sm">
                      <span className="inline-flex items-center gap-1.5 flex-wrap">
                        {/* Badges */}
                        {m.badges.map((badge, idx) => {
                          const { emoji, title, description } = getBadgeInfo(badge.setID, badge.version);
                          return (
                            <span
                              key={`${badge.setID}-${badge.version}-${idx}`}
                              className="text-sm leading-none"
                              title={`${title}: ${description}`}
                            >
                              {emoji}
                            </span>
                          );
                        })}

                        {/* Username */}
                        <span 
                          className="font-bold cursor-pointer hover:underline transition-all duration-150" 
                          style={{ color: enhanceUserColor(m.color) }}
                          onClick={() => handleReply(m)}
                          title="Click to reply"
                        >
                          {m.displayName}:
                        </span>
                      </span>
                      
                      {/* Message text on same line */}
                      <span className="leading-relaxed text-text break-words ml-1">
                        {messageParts.map((part, idx) => {
                          if (part.type === 'emote' && part.emoteUrl) {
                            return (
                              <img
                                key={idx}
                                src={part.emoteUrl}
                                alt={part.content}
                                title={part.content}
                                className="inline-block h-6 w-6 align-middle mx-0.5"
                                onError={(e) => {
                                  console.warn(`❌ Failed to load emote: ${part.content} (${part.emoteUrl})`);
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                                onLoad={() => {
                                  console.log(`✅ Loaded emote: ${part.content}`);
                                }}
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
                            <img
                              key={idx}
                              src={part.emoteUrl}
                              alt={part.content}
                              title={part.content}
                              className="inline-block h-6 w-6 align-middle mx-0.5"
                              onError={(e) => {
                                console.warn(`❌ Failed to load emote: ${part.content} (${part.emoteUrl})`);
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                              onLoad={() => {
                                console.log(`✅ Loaded emote: ${part.content}`);
                              }}
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
        <form className="p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Chat functionality coming soon
                console.log('Message would be sent:', input);
              }
            }}
            className="w-full rounded-lg bg-bg border border-white/20 px-4 py-2.5 text-sm text-white outline-none ring-purple-500/50 focus:ring-2 focus:border-purple-500/50 placeholder:text-text-muted transition-all duration-200"
            placeholder="type here."
            maxLength={500}
          />
        </form>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <div className="absolute bottom-20 right-4 z-10">
            <button
              onClick={scrollToBottom}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110"
              title="Scroll to bottom"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
