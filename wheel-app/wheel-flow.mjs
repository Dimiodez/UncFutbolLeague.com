const groups = [
  {
    id: 'draw',
    label: 'Team Draws',
    modes: [
      { id: 'cup', label: 'Cup Night', title: 'Cup Night Draw' },
      { id: 'captain', label: 'Captain Draft' },
      { id: 'fantasy', label: 'Fantasy Value Draft' },
    ],
  },
  {
    id: 'tournament',
    label: 'Tournaments',
    modes: [
      { id: 'standings', label: 'Competitions' },
      { id: 'drawings', label: 'Live Group Draw' },
      { id: 'aggregate', label: 'Aggregate BYOT' },
    ],
  },
];

const eventKey = 'uwu.cup-night-event.v1';
const modes = groups.flatMap(group => group.modes);

export function normalizeWheelMode(mode) {
  return modes.some(item => item.id === mode) ? mode : 'cup';
}

export function wheelModeTitle(mode) {
  const item = modes.find(entry => entry.id === normalizeWheelMode(mode));
  return item.title || item.label;
}

export function readCupEvent(storage = globalThis.localStorage) {
  try {
    const event = JSON.parse(storage.getItem(eventKey) || 'null');
    if (typeof event?.name !== 'string' || !event.name.trim()) return null;
    const { session, bracket } = event;
    if (!Array.isArray(session?.teams) || !Array.isArray(session.players) || !Array.isArray(session.assignments)) return null;
    if (bracket && (!Array.isArray(bracket.teams) || !bracket.scores)) return null;
    return event;
  } catch {
    return null;
  }
}

export function saveCupEvent(event, storage = globalThis.localStorage) {
  storage.setItem(eventKey, JSON.stringify(event));
}

export function makeWheelFlow(React) {
  const h = React.createElement;

  function Navigation({ mode, onSelect }) {
    const group = groups.find(group => group.modes.some(item => item.id === mode));
    const lastMode = React.useRef({ draw: 'cup', tournament: 'standings' });
    React.useEffect(() => {
      lastMode.current[group.id] = mode;
    }, [group, mode]);
    return h('nav', { className: 'wheel-navigation', 'aria-label': 'Wheel Utility' },
      h('div', { className: 'wheel-nav-groups', role: 'group', 'aria-label': 'Tool groups' },
        ...groups.map(item => h('button', {
          key: item.id, type: 'button', 'aria-pressed': item === group,
          onClick: () => onSelect(lastMode.current[item.id]),
        }, item.label))),
      h('div', { className: 'wheel-nav-tools', role: 'group', 'aria-label': group.label },
        ...group.modes.map(item => h('button', {
          key: item.id, type: 'button', 'aria-current': item.id === mode ? 'page' : undefined,
          onClick: () => onSelect(item.id),
        }, item.label))));
  }

  function CupFlow({ step, bracket, champion, busy, savedEvent, onDraw, onBracket, onResults, onSave, onResume }) {
    const [name, setName] = React.useState(savedEvent?.name || '');
    const [message, setMessage] = React.useState('');
    function save(event) {
      event.preventDefault();
      const nextName = name.trim();
      if (!nextName) {
        setMessage('Enter an event name first.');
        return;
      }
      try {
        onSave(nextName);
        setMessage('Draw and bracket saved in this browser.');
      } catch {
        setMessage('Browser storage is unavailable. The event could not be saved.');
      }
    }

    return h('section', { className: 'cup-flow', 'aria-label': 'Cup Night event' },
      h('div', { className: 'cup-flow-head' },
        h('div', null,
          h('p', { className: 'eyebrow' }, 'CUP NIGHT'),
          h('strong', null, savedEvent?.name || 'Match night')),
        h('details', { className: 'cup-event-controls' },
          h('summary', null, 'Save or resume event'),
          h('form', { onSubmit: save },
            h('label', null, 'Event name', h('input', {
              value: name, maxLength: 80, required: true, onChange: event => setName(event.target.value),
            })),
            h('div', { className: 'cup-event-actions' },
              h('button', { type: 'submit', disabled: busy }, 'Save event'),
              savedEvent && h('button', {
                type: 'button', disabled: busy, onClick: () => {
                  if (onResume()) {
                    setName(savedEvent.name);
                    setMessage('Restored ' + savedEvent.name + '.');
                  }
                },
              }, 'Resume saved event')),
            h('p', { role: 'status' }, message || 'Save a named snapshot of this draw and its Cup Night bracket.')))),
      h('ol', { className: 'cup-flow-steps', 'aria-label': 'Cup Night steps' },
        ...[
          { id: 'draw', label: 'Draw teams', action: onDraw, available: true },
          { id: 'bracket', label: 'Play bracket', action: onBracket, available: !!bracket },
          { id: 'results', label: 'Results', action: onResults, available: !!champion },
        ].map((item, index) => h('li', { key: item.id },
          h('button', {
            type: 'button', onClick: item.action,
            disabled: !item.available,
            'aria-current': step === item.id ? 'step' : undefined,
          }, h('span', { 'aria-hidden': true }, index + 1), item.label)))));
  }

  return { Navigation, CupFlow };
}
