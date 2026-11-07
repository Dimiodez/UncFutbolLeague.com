import { createBracket, resolveBracket, setMatchScore, teamCounts } from './double-elimination.mjs?v=20261107-bracket1';

function matchName(id) {
  if (id === 'GF') return 'Grand Final';
  if (id === 'GF2') return 'Reset Final';
  return id;
}

export function makeDoubleEliminationView(React) {
  const h = React.createElement;

  function MatchCard({ match, teams, onScore }) {
    const [error, setError] = React.useState('');
    const ready = match.status === 'ready' || match.status === 'complete';
    const teamsInMatch = [match.home, match.away];
    const participants = teamsInMatch.map((id, index) => {
      if (id === null) return 'Bye';
      if (id !== undefined) return teams.get(id).name;
      const source = match.sources[index];
      return (source.outcome === 'loser' ? 'Loser of ' : 'Winner of ') + matchName(source.match.id);
    });
    function submit(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      try {
        onScore(match.id, data.get('home'), data.get('away'));
        setError('');
        const editor = form.closest('details');
        editor.open = false;
        editor.querySelector('summary').focus();
      } catch (failure) {
        setError(failure.message);
      }
    }
    return h('article', { className: 'de-match', 'data-match': match.id },
      h('header', null, h('strong', null, matchName(match.id)),
        h('span', null, { complete: 'Final', ready: 'Ready', waiting: 'Waiting', bye: 'Bye' }[match.status])),
      ...participants.map((name, index) => {
        const team = teams.get(teamsInMatch[index]);
        const won = !!team && team.id === match.winner;
        const score = index === 0 ? match.score?.homeScore : match.score?.awayScore;
        return h('div', { key: index, className: 'de-team-row' + (won ? ' de-winner' : '') },
          h('span', { className: 'de-team-name' }, name),
          won && h('span', { title: 'Winner', 'aria-label': 'Winner' }, '✓'),
          score !== undefined && h('strong', null, score));
      }),
      ready && h('details', { className: 'de-score-editor' },
        h('summary', { 'aria-label': (match.score ? 'Edit score for ' : 'Enter score for ') + matchName(match.id) },
          match.score ? 'Edit score' : 'Enter score'),
        h('form', { onSubmit: submit, key: match.score ? match.score.homeScore + '-' + match.score.awayScore : 'new' },
          h('div', { className: 'de-score-fields' },
            ...participants.map((name, index) => h('label', { key: index }, name,
              h('input', {
                name: index === 0 ? 'home' : 'away',
                type: 'text', inputMode: 'numeric', pattern: '[0-9]{1,2}', maxLength: 2, required: true,
                defaultValue: index === 0 ? match.score?.homeScore : match.score?.awayScore,
              })))),
          h('button', { className: 'de-primary', type: 'submit' }, 'Save score'),
          error && h('p', { role: 'alert', className: 'de-error' }, error))));
  }

  function Lane({ title, rounds, teams, onScore, final }) {
    const rail = React.useRef(null);
    const [paths, setPaths] = React.useState([]);
    React.useLayoutEffect(() => {
      const container = rail.current;
      const cards = new Map(Array.from(container.querySelectorAll('[data-match]'), card => [card.dataset.match, card]));
      function drawConnections() {
        const origin = container.getBoundingClientRect();
        const connections = rounds.slice(1).flatMap(round => round.flatMap(match => match.sources.flatMap(source => {
          const from = cards.get(source.match?.id);
          if (!from) return [];
          const start = from.getBoundingClientRect();
          const end = cards.get(match.id).getBoundingClientRect();
          const left = start.right - origin.left;
          const right = end.left - origin.left;
          const middle = (left + right) / 2;
          const top = start.top + start.height / 2 - origin.top;
          const bottom = end.top + end.height / 2 - origin.top;
          return [left + ',' + top + ' ' + middle + ',' + top + ' ' + middle + ',' + bottom + ' ' + right + ',' + bottom];
        })));
        setPaths(connections);
      }
      drawConnections();
      const resize = new ResizeObserver(drawConnections);
      resize.observe(container);
      cards.forEach(card => resize.observe(card));
      return () => resize.disconnect();
    }, [rounds]);

    return h('section', { className: 'de-lane' },
      h('h3', null, title),
      h('div', { className: 'de-rounds', ref: rail },
        h('svg', { className: 'de-paths', 'aria-hidden': true }, ...paths.map((points, index) =>
          h('polyline', { key: index, points }))),
        ...rounds.map((round, index) =>
        h('section', { className: 'de-round', key: index },
          h('h4', null, final ? (index === 0 ? 'Championship' : 'If necessary') : 'Round ' + (index + 1)),
          h('div', { className: 'de-match-stack' }, ...round.map(match =>
            h(MatchCard, {
              key: JSON.stringify([match.id, match.home, match.away]),
              match, teams, onScore,
            })))))));
  }

  return function DoubleElimination({ bracket, onChange, saved }) {
    const [count, setCount] = React.useState(4);
    const [names, setNames] = React.useState([]);
    const [error, setError] = React.useState('');
    const setup = React.useRef(null);
    React.useEffect(() => {
      if (setup.current) setup.current.open = !bracket;
    }, [!!bracket]);
    const teams = new Map((bracket?.teams ?? []).map(team => [team.id, team]));
    const board = React.useMemo(() => bracket && resolveBracket(bracket), [bracket]);

    function generate(event) {
      event.preventDefault();
      try {
        const next = createBracket(Array.from({ length: count }, (_, index) => ({
          id: 'manual-' + (index + 1),
          name: (names[index] || '').trim(),
          players: [],
        })));
        if (bracket && !window.confirm('Replace the current double elimination bracket and its scores?')) return;
        onChange(next);
        setError('');
        setup.current.open = false;
      } catch (failure) {
        setError(failure.message);
      }
    }

    function onScore(id, home, away) {
      onChange(setMatchScore(bracket, id, home, away));
    }

    return h('section', { className: 'de-workspace', 'aria-labelledby': 'de-title' },
      h('header', { className: 'de-hero' },
        h('p', { className: 'eyebrow' }, 'TOURNAMENT BUILDER'),
        h('h2', { id: 'de-title' }, 'Double Elimination'),
        h('p', null, 'Two losses eliminate a team. If the losers bracket winner takes the Grand Final, play a Reset Final.')),
      h('details', { className: 'de-setup', ref: setup },
        h('summary', null, bracket ? 'Create or replace bracket' : 'Set up a bracket'),
        h('form', { onSubmit: generate },
          h('label', null, 'Number of teams',
            h('select', { value: count, onChange: event => setCount(Number(event.target.value)) },
              ...teamCounts.map(number => h('option', { key: number, value: number }, number + ' teams')))),
          h('div', { className: 'de-name-grid' },
            ...Array.from({ length: count }, (_, index) =>
              h('label', { key: index }, 'Team ' + (index + 1),
                h('input', { required: true, value: names[index] || '', onChange: event => {
                  const name = event.target.value;
                  setNames(current => {
                    const next = [...current];
                    next[index] = name;
                    return next;
                  });
                } })))),
          h('button', { type: 'submit', className: 'de-primary' }, 'Generate bracket'),
          error && h('p', { role: 'alert', className: 'de-error' }, error))),
      board && h(React.Fragment, null,
        h('div', { className: 'de-info' },
          h('p', { role: 'status' }, board.champion
            ? 'Champion · ' + teams.get(board.champion).name
            : teams.size + ' teams · ' + (saved ? 'Saved in this browser' : 'Browser storage unavailable')),
          h('p', null, 'Changing a winner clears any scores for affected matchups. Scroll across to see later rounds.')),
        h('div', { className: 'de-board', tabIndex: 0, role: 'region', 'aria-label': 'Double elimination bracket' },
          h('div', { className: 'de-lanes' },
            h(Lane, { title: 'Winners bracket', rounds: board.winners, teams, onScore }),
            board.losers.length > 0 && h(Lane, { title: 'Losers bracket', rounds: board.losers, teams, onScore })),
          h(Lane, { title: 'Finals', rounds: board.finals.map(match => [match]), teams, onScore, final: true })),
        h('details', { className: 'de-rosters' },
          h('summary', null, 'Team rosters · ' + teams.size + ' teams'),
          h('div', { className: 'de-roster-grid' }, ...bracket.teams.map((team, index) =>
            h('article', { key: team.id, style: Number.isFinite(team.colorHue) ? {
              borderTopColor: 'hsl(' + team.colorHue + ' 82% 55%)',
            } : undefined },
              h('small', null, 'Seed ' + (index + 1)),
              h('h3', null, team.name),
              team.players.length ? h('ul', null, ...team.players.map((player, index) =>
                h('li', { key: index }, player.name, player.position && h('small', null, ' · ' + player.position))))
                : h('p', null, 'Team entered by name.')))))));
  };
}
