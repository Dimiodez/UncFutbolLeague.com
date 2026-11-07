import { readScreenshot, uniquePlayerNames } from './player-ocr.mjs?v=20261107-ocr1';

const acceptedImages = new Set(['image/png', 'image/jpeg', 'image/webp']);
const maxImageBytes = 12 * 1024 * 1024;

export function makePlayerScreenshotImport(React) {
  const h = React.createElement;

  return function PlayerScreenshotImport({ players, onAdd }) {
    const [format, setFormat] = React.useState('voice');
    const [names, setNames] = React.useState('');
    const [status, setStatus] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const reading = React.useRef(false);
    const namesToAdd = uniquePlayerNames(names, players);

    async function read(file) {
      if (!file || reading.current) return;
      if (!acceptedImages.has(file.type) || file.size > maxImageBytes) {
        setStatus('Choose a PNG, JPG, or WebP screenshot up to 12 MB.');
        return;
      }
      reading.current = true;
      setBusy(true);
      setNames('');
      setStatus('Loading the screenshot reader…');
      try {
        const detected = await readScreenshot(file, format, setStatus);
        setNames(detected.join('\n'));
        setStatus(detected.length
          ? 'Review the detected names and correct any spelling before adding them.'
          : 'No names found. Try cropping to the list or choosing the other image type.');
      } catch (error) {
        setStatus(error.message || 'Could not read the screenshot. Try a smaller crop.');
      } finally {
        reading.current = false;
        setBusy(false);
      }
    }

    function paste(event) {
      const file = [...event.clipboardData.files].find(file => file.type.startsWith('image/'));
      if (!file) return;
      event.preventDefault();
      void read(file);
    }

    return h('details', { className: 'player-screenshot-import', onPaste: paste },
      h('summary', null, 'Import names from a screenshot'),
      h('p', null, 'Crop to the player list if you can. The screenshot is read on this device.'),
      h('div', { className: 'player-screenshot-controls' },
        h('label', null, 'Screenshot type',
          h('select', { value: format, disabled: busy, onChange: event => setFormat(event.target.value) },
            h('option', { value: 'voice' }, 'Discord voice channel'),
            h('option', { value: 'signup' }, 'Signup sheet or name list'))),
        h('label', null, 'Choose screenshot',
          h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', disabled: busy, onChange: event => {
            const file = event.target.files[0];
            event.target.value = '';
            void read(file);
          } })),
        h('input', {
          className: 'player-screenshot-paste', type: 'text', readOnly: true,
          'aria-label': 'Paste screenshot here', placeholder: 'Click here, then paste the screenshot',
        })),
      h('p', { role: 'status' }, status),
      names && h('div', { className: 'player-screenshot-review' },
        h('label', null, 'Review detected names',
          h('textarea', {
            rows: Math.min(10, Math.max(3, names.split('\n').length)),
            value: names, onChange: event => setNames(event.target.value),
          })),
        h('p', null, 'One name per line. Names already on the wheel are skipped.'),
        h('div', { className: 'input-actions' },
          h('button', {
            type: 'button', disabled: !namesToAdd.length || busy,
            onClick: () => {
              onAdd(namesToAdd);
              setNames('');
              setStatus('Added ' + namesToAdd.length + (namesToAdd.length === 1 ? ' player.' : ' players.'));
            },
          }, 'Add ' + namesToAdd.length + (namesToAdd.length === 1 ? ' player to wheel' : ' players to wheel')),
          h('button', { type: 'button', onClick: () => { setNames(''); setStatus('Import cleared.'); } }, 'Clear import'))));
  };
}
