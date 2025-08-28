"use client";

import { useState, useEffect, useCallback } from 'react';

interface FollowedChannel {
  channel: string;
  displayName: string;
  followedAt: Date;
  lastLive?: Date;
}

const FOLLOWS_KEY = 'solace_follows';

export function useFollows() {
  const [follows, setFollows] = useState<FollowedChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load follows from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FOLLOWS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const follows = parsed.map((f: any) => ({
          ...f,
          followedAt: new Date(f.followedAt),
          lastLive: f.lastLive ? new Date(f.lastLive) : undefined
        }));
        setFollows(follows);
      }
    } catch (error) {
      console.error('Error loading follows:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save follows to localStorage
  const saveFollows = useCallback((newFollows: FollowedChannel[]) => {
    try {
      localStorage.setItem(FOLLOWS_KEY, JSON.stringify(newFollows));
      setFollows(newFollows);
    } catch (error) {
      console.error('Error saving follows:', error);
    }
  }, []);

  // Follow a channel
  const followChannel = useCallback((channel: string, displayName?: string) => {
    const newFollow: FollowedChannel = {
      channel: channel.toLowerCase(),
      displayName: displayName || channel,
      followedAt: new Date()
    };

    setFollows(prev => {
      // Check if already following
      if (prev.some(f => f.channel === newFollow.channel)) {
        return prev;
      }
      
      const updated = [...prev, newFollow].sort((a, b) => 
        b.followedAt.getTime() - a.followedAt.getTime()
      );
      
      saveFollows(updated);
      return updated;
    });
  }, [saveFollows]);

  // Unfollow a channel
  const unfollowChannel = useCallback((channel: string) => {
    setFollows(prev => {
      const updated = prev.filter(f => f.channel !== channel.toLowerCase());
      saveFollows(updated);
      return updated;
    });
  }, [saveFollows]);

  // Check if following a channel
  const isFollowing = useCallback((channel: string) => {
    return follows.some(f => f.channel === channel.toLowerCase());
  }, [follows]);

  // Get follow count
  const followCount = follows.length;

  // Update last live time for a channel
  const updateLastLive = useCallback((channel: string) => {
    setFollows(prev => {
      const updated = prev.map(f => 
        f.channel === channel.toLowerCase() 
          ? { ...f, lastLive: new Date() }
          : f
      );
      saveFollows(updated);
      return updated;
    });
  }, [saveFollows]);

  return {
    follows,
    isLoading,
    followChannel,
    unfollowChannel,
    isFollowing,
    followCount,
    updateLastLive
  };
}