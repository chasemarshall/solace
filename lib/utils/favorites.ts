export const getFavorites = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const favorites = localStorage.getItem('twitch-favorites');
    return new Set(favorites ? JSON.parse(favorites) : []);
  } catch {
    return new Set();
  }
};

export const addFavorite = (channelLogin: string) => {
  if (typeof window === 'undefined') return;
  try {
    const favorites = getFavorites();
    favorites.add(channelLogin.toLowerCase());
    localStorage.setItem('twitch-favorites', JSON.stringify([...favorites]));
  } catch (e) {
    console.error('Failed to add favorite:', e);
  }
};

export const removeFavorite = (channelLogin: string) => {
  if (typeof window === 'undefined') return;
  try {
    const favorites = getFavorites();
    favorites.delete(channelLogin.toLowerCase());
    localStorage.setItem('twitch-favorites', JSON.stringify([...favorites]));
  } catch (e) {
    console.error('Failed to remove favorite:', e);
  }
};

export const isFavorite = (channelLogin: string): boolean => {
  return getFavorites().has(channelLogin.toLowerCase());
};