import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getFavorites, addFavorite, removeFavorite, isFavorite } from '@/lib/utils/favorites';
import { STORAGE_KEYS } from '@/lib/constants/storage';

describe('favorites utility', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getFavorites', () => {
    it('should return empty Set when no favorites exist', () => {
      const favorites = getFavorites();
      expect(favorites).toBeInstanceOf(Set);
      expect(favorites.size).toBe(0);
    });

    it('should return Set with favorites from localStorage', () => {
      const mockFavorites = ['channel1', 'channel2', 'channel3'];
      localStorage.setItem(STORAGE_KEYS.TWITCH_FAVORITES, JSON.stringify(mockFavorites));

      const favorites = getFavorites();
      expect(favorites.size).toBe(3);
      expect(favorites.has('channel1')).toBe(true);
      expect(favorites.has('channel2')).toBe(true);
      expect(favorites.has('channel3')).toBe(true);
    });

    it('should return empty Set when localStorage data is malformed', () => {
      localStorage.setItem(STORAGE_KEYS.TWITCH_FAVORITES, 'invalid json');

      const favorites = getFavorites();
      expect(favorites).toBeInstanceOf(Set);
      expect(favorites.size).toBe(0);
    });

    it('should handle empty array in localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.TWITCH_FAVORITES, JSON.stringify([]));

      const favorites = getFavorites();
      expect(favorites.size).toBe(0);
    });
  });

  describe('addFavorite', () => {
    it('should add a favorite to empty favorites', () => {
      addFavorite('testchannel');

      const favorites = getFavorites();
      expect(favorites.has('testchannel')).toBe(true);
      expect(favorites.size).toBe(1);
    });

    it('should add a favorite to existing favorites', () => {
      localStorage.setItem(STORAGE_KEYS.TWITCH_FAVORITES, JSON.stringify(['existing']));

      addFavorite('newchannel');

      const favorites = getFavorites();
      expect(favorites.has('existing')).toBe(true);
      expect(favorites.has('newchannel')).toBe(true);
      expect(favorites.size).toBe(2);
    });

    it('should convert channel name to lowercase', () => {
      addFavorite('TestChannel');

      const favorites = getFavorites();
      expect(favorites.has('testchannel')).toBe(true);
      expect(favorites.has('TestChannel')).toBe(false);
    });

    it('should not add duplicate favorites', () => {
      addFavorite('channel1');
      addFavorite('channel1');

      const favorites = getFavorites();
      expect(favorites.size).toBe(1);
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.setItem to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw
      expect(() => addFavorite('test')).not.toThrow();

      // Restore original
      localStorage.setItem = originalSetItem;
    });
  });

  describe('removeFavorite', () => {
    it('should remove a favorite from favorites', () => {
      localStorage.setItem(STORAGE_KEYS.TWITCH_FAVORITES, JSON.stringify(['channel1', 'channel2']));

      removeFavorite('channel1');

      const favorites = getFavorites();
      expect(favorites.has('channel1')).toBe(false);
      expect(favorites.has('channel2')).toBe(true);
      expect(favorites.size).toBe(1);
    });

    it('should convert channel name to lowercase before removing', () => {
      localStorage.setItem(STORAGE_KEYS.TWITCH_FAVORITES, JSON.stringify(['testchannel']));

      removeFavorite('TestChannel');

      const favorites = getFavorites();
      expect(favorites.has('testchannel')).toBe(false);
      expect(favorites.size).toBe(0);
    });

    it('should handle removing non-existent favorite', () => {
      localStorage.setItem(STORAGE_KEYS.TWITCH_FAVORITES, JSON.stringify(['channel1']));

      removeFavorite('nonexistent');

      const favorites = getFavorites();
      expect(favorites.size).toBe(1);
      expect(favorites.has('channel1')).toBe(true);
    });

    it('should handle localStorage errors gracefully', () => {
      localStorage.setItem(STORAGE_KEYS.TWITCH_FAVORITES, JSON.stringify(['channel1']));

      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw
      expect(() => removeFavorite('channel1')).not.toThrow();

      localStorage.setItem = originalSetItem;
    });
  });

  describe('isFavorite', () => {
    it('should return true for favorited channel', () => {
      localStorage.setItem(STORAGE_KEYS.TWITCH_FAVORITES, JSON.stringify(['testchannel']));

      expect(isFavorite('testchannel')).toBe(true);
    });

    it('should return false for non-favorited channel', () => {
      localStorage.setItem(STORAGE_KEYS.TWITCH_FAVORITES, JSON.stringify(['testchannel']));

      expect(isFavorite('otherchannel')).toBe(false);
    });

    it('should be case-insensitive', () => {
      localStorage.setItem(STORAGE_KEYS.TWITCH_FAVORITES, JSON.stringify(['testchannel']));

      expect(isFavorite('TestChannel')).toBe(true);
      expect(isFavorite('TESTCHANNEL')).toBe(true);
      expect(isFavorite('testchannel')).toBe(true);
    });

    it('should return false when favorites is empty', () => {
      expect(isFavorite('anychannel')).toBe(false);
    });
  });

  describe('integration', () => {
    it('should maintain favorites across add and remove operations', () => {
      // Add multiple favorites
      addFavorite('channel1');
      addFavorite('channel2');
      addFavorite('channel3');

      expect(isFavorite('channel1')).toBe(true);
      expect(isFavorite('channel2')).toBe(true);
      expect(isFavorite('channel3')).toBe(true);

      // Remove one
      removeFavorite('channel2');

      expect(isFavorite('channel1')).toBe(true);
      expect(isFavorite('channel2')).toBe(false);
      expect(isFavorite('channel3')).toBe(true);

      // Add it back
      addFavorite('channel2');

      expect(isFavorite('channel2')).toBe(true);

      const favorites = getFavorites();
      expect(favorites.size).toBe(3);
    });

    it('should persist favorites in localStorage correctly', () => {
      addFavorite('channel1');
      addFavorite('channel2');

      const stored = localStorage.getItem(STORAGE_KEYS.TWITCH_FAVORITES);
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toContain('channel1');
      expect(parsed).toContain('channel2');
    });
  });
});
