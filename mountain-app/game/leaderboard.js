export const LEADERBOARD_STORAGE_KEY = 'mountain-mayhem-local-leaderboard-v1';
export const LEADERBOARD_LIMIT = 10;

export function formatRunTime(milliseconds) {
  const totalTenths = Math.max(0, Math.floor((Number(milliseconds) || 0) / 100));
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor(totalTenths / 10) % 60;
  const tenths = totalTenths % 10;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

export function sortLeaderboardEntries(entries = []) {
  return [...entries]
    .filter((entry) => Number.isFinite(entry?.activePlayMs) && Number.isFinite(entry?.totalDeaths))
    .sort((a, b) => a.activePlayMs - b.activePlayMs || a.totalDeaths - b.totalDeaths)
    .slice(0, LEADERBOARD_LIMIT);
}

export function loadLeaderboard(storage = window.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(LEADERBOARD_STORAGE_KEY) || '[]');
    return sortLeaderboardEntries(Array.isArray(value) ? value : []);
  } catch {
    return [];
  }
}

export function saveLeaderboardEntry(summary, storage = window.localStorage) {
  const entry = { ...summary, completedAt: new Date().toISOString() };
  const entries = sortLeaderboardEntries([...loadLeaderboard(storage), entry]);
  try { storage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(entries)); } catch { /* local prototype can still show this run */ }
  return { entry, entries };
}
