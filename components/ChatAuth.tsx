"use client";

import { useState, useEffect } from "react";
import { User, LogOut } from "lucide-react";

interface ChatAuthProps {
  onAuthChange: (username?: string, oauth?: string) => void;
}

export function ChatAuth({ onAuthChange }: ChatAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [oauth, setOauth] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    // Check for stored credentials
    const storedUsername = localStorage.getItem('twitch_username');
    const storedOauth = localStorage.getItem('twitch_oauth');
    
    if (storedUsername && storedOauth) {
      setUsername(storedUsername);
      setOauth(storedOauth);
      setIsAuthenticated(true);
      onAuthChange(storedUsername, storedOauth);
    }
  }, [onAuthChange]);

  const handleLogin = () => {
    if (!username.trim() || !oauth.trim()) return;

    // Store credentials
    localStorage.setItem('twitch_username', username);
    localStorage.setItem('twitch_oauth', oauth);
    
    setIsAuthenticated(true);
    setShowForm(false);
    onAuthChange(username, oauth);
  };

  const handleLogout = () => {
    localStorage.removeItem('twitch_username');
    localStorage.removeItem('twitch_oauth');
    
    setUsername("");
    setOauth("");
    setIsAuthenticated(false);
    setShowForm(false);
    onAuthChange();
  };

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-green-400">
          <User className="h-3 w-3" />
          <span>{username}</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-text-muted hover:text-red-400 transition-colors"
          title="Logout from chat"
        >
          <LogOut className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowForm(!showForm)}
        className="text-xs text-text-muted hover:text-white transition-colors border border-white/10 rounded px-2 py-1 hover:bg-white/5"
      >
        login to chat
      </button>

      {showForm && (
        <div className="absolute right-0 top-8 z-50 bg-surface border border-white/20 rounded-lg p-3 shadow-lg w-64">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="w-full text-xs bg-bg border border-white/20 rounded px-2 py-1.5 text-white focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">OAuth Token</label>
              <input
                type="password"
                value={oauth}
                onChange={(e) => setOauth(e.target.value)}
                placeholder="oauth:your_token"
                className="w-full text-xs bg-bg border border-white/20 rounded px-2 py-1.5 text-white focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <a
                href="https://twitchapps.com/tmi/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Get token
              </a>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="text-xs text-text-muted hover:text-white px-2 py-1 rounded hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogin}
                  disabled={!username.trim() || !oauth.trim()}
                  className="text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white px-2 py-1 rounded transition-colors"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}