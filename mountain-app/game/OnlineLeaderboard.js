import { formatRunTime } from './leaderboard.js';

export function renderMountainBoard(root, entries) {
  root.replaceChildren();
  entries.forEach((entry, index) => {
    const row = document.createElement('tr');
    [index + 1, entry.displayName, formatRunTime(entry.activePlayMs), entry.totalDeaths,
      entry.ballsTakenToFace, entry.salmonStrikes, entry.bruceSockKnocks, entry.bizzieInterruptions]
      .forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); });
    root.append(row);
  });
}

export class OnlineLeaderboard {
  constructor(status, body) { this.status = status; this.body = body; this.session = Promise.resolve(null); }
  async refresh() {
    try {
      const response = await fetch('/api/mountain/leaderboard', { credentials: 'same-origin' });
      if (!response.ok) throw Error();
      const { entries } = await response.json();
      renderMountainBoard(this.body, entries);
      if (!entries.length) this.status.textContent = 'No completed runs yet. Be the first to send Schwein off!';
    } catch { this.status.textContent = 'Shared leaderboard unavailable. Your game is still playable.'; }
  }
  async post(body) {
    const response = await fetch('/api/mountain/run', {
      method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw Error('Shared leaderboard unavailable. Your game is still playable.');
    }
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw Error(result.error || 'Could not save this run.');
    }
    return response.json();
  }
  begin(eligible) {
    if (!eligible) { this.session = Promise.resolve(null); return; }
    this.session = this.post({ action: 'start' }).then(({ id }) => {
      this.status.textContent = 'Full campaign started. Your best completed run will be saved.';
      return id;
    }).catch(error => { this.status.textContent = error.message; return null; });
  }
  checkpoint(level, stats) {
    this.session = this.session.then(async id => {
      if (!id) return null;
      await this.post({ action: 'checkpoint', id, level, stats });
      if (level === 10) {
        this.status.textContent = 'Run saved! The board keeps your fastest full campaign, with deaths breaking ties.';
        await this.refresh();
      }
      return id;
    }).catch(error => { this.status.textContent = error.message; return null; });
  }
}
