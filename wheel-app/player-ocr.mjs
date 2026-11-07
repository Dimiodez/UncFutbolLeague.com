const assetRoot = new URL('./ocr-v7/', import.meta.url);
let enginePromise;

function loadEngine() {
  if (enginePromise) return enginePromise;
  enginePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(fail, 15000);
    function fail() {
      clearTimeout(timer);
      script.remove();
      reject(new Error('Could not load the screenshot reader. Try again.'));
    }
    script.src = new URL('tesseract.min.js', assetRoot).href;
    script.onload = () => {
      clearTimeout(timer);
      if (window.Tesseract) resolve(window.Tesseract);
      else fail();
    };
    script.onerror = fail;
    document.head.append(script);
  }).catch(error => {
    enginePromise = undefined;
    throw error;
  });
  return enginePromise;
}

export function uniquePlayerNames(text, existing = []) {
  const key = name => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  const seen = new Set(existing.map(key));
  const names = [];
  for (const line of text.split(/\r?\n/)) {
    const name = line.trim().replace(/\s+/g, ' ');
    if (!name || seen.has(key(name))) continue;
    seen.add(key(name));
    names.push(name);
  }
  return names;
}

const time = /\b\d{1,2}:\d{2}(?::\d{2})?\b/;
const textLike = value => /[\p{L}\p{N}]{2}/u.test(value);

export function signupCandidates(text) {
  const rows = text.split(/\r?\n/).flatMap(line => {
    const value = line.trim();
    if (!value || time.test(value) || /^(?:#|discord\s*$|participants\s*(?:\(\d+\))?\s*$|players?\s*$|player names?\s*$|sign.?ups?\b|signed up\b|tentative\b|substitutes?\s*(?:\(\d+\))?\s*$|roster\s*$|names?\s*$|reply\s*$|message\b|page \d+\b)/i.test(value)) return [];
    const cleaned = value.replace(/^(?:\d{1,3}[.)]\s*|[-•*✓✔]\s*|@\s*)/, '').trim();
    return textLike(cleaned) && cleaned.length <= 70 ? [cleaned] : [];
  });
  return uniquePlayerNames(rows.join('\n'));
}

export function voiceRows(lines) {
  const words = lines.flatMap(line => line.words.filter(word => textLike(word.text)));
  const heights = words.map(word => word.bbox.y1 - word.bbox.y0).sort((a, b) => a - b);
  const height = heights[Math.floor(heights.length / 2)];
  if (!height) return [];
  const tolerance = Math.max(3, Math.round(height * 0.25));
  const candidates = lines.filter(line => !time.test(line.text)).map(line => ({
    ...line,
    words: line.words.filter(word => textLike(word.text) && word.bbox.y1 - word.bbox.y0 <= height * 1.7),
  }));
  const starts = candidates.flatMap(line => line.words.slice(0, 2).map(word => word.bbox.x0));
  const best = starts.reduce((best, left) => {
    const count = candidates.filter(line => line.words.some(word => Math.abs(word.bbox.x0 - left) <= tolerance)).length;
    return count > best.count || (count === best.count && left < best.left) ? { left, count } : best;
  }, { count: 0, left: Infinity });
  if (best.count < 2) return [];
  return candidates.flatMap(line => {
    const word = line.words.find(word => Math.abs(word.bbox.x0 - best.left) <= tolerance);
    if (!word) return [];
    const afterName = line.words.some(other => other.bbox.x0 > word.bbox.x0);
    const plain = !afterName && /^[\p{L}\p{N}_.-]+$/u.test(word.text) ? word.text : undefined;
    return [{ box: word.bbox, height, plain }];
  }).sort((a, b) => a.box.y0 - b.box.y0);
}

function cleanVoiceImage(canvas, rows) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const source = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const scale = 2;
  const rowHeight = Math.ceil(Math.max(...rows.map(row => row.height)) * 2.6);
  const width = canvas.width - Math.min(...rows.map(row => row.box.x0)) + 12;
  const output = document.createElement('canvas');
  output.width = width * scale;
  output.height = rows.length * rowHeight * scale;
  const target = output.getContext('2d');
  target.fillStyle = 'white';
  target.fillRect(0, 0, output.width, output.height);

  function pixel(x, y) {
    const offset = (y * source.width + x) * 4;
    const red = source.data[offset], green = source.data[offset + 1], blue = source.data[offset + 2];
    return { light: (red + green + blue) / 3, chroma: Math.max(red, green, blue) - Math.min(red, green, blue) };
  }

  rows.forEach(({ box, height }, index) => {
    const left = Math.max(0, box.x0 - 2);
    const center = Math.round((box.y0 + box.y1) / 2);
    const top = Math.max(0, Math.floor(center - height * 0.95));
    const bottom = Math.min(canvas.height, Math.ceil(center + height * 0.95));
    const bandTop = Math.max(top, Math.floor(center - height * 0.58));
    const bandBottom = Math.min(bottom, Math.ceil(center + height * 0.58));
    const background = pixel(left, top).light;
    let right = canvas.width;
    let consecutive = 0;
    for (let x = left + Math.round(height * 0.85); x < right; x++) {
      let chip = 0, colored = 0;
      for (let y = bandTop; y < bandBottom; y++) {
        const { light, chroma } = pixel(x, y);
        const contrast = Math.abs(light - background);
        if (contrast >= 7 && contrast <= 64) chip++;
        if (chroma >= 42 && contrast > 18) colored++;
      }
      const decoration = chip >= (bandBottom - bandTop) * 0.65 || colored >= (bandBottom - bandTop) * 0.25;
      consecutive = decoration ? consecutive + 1 : 0;
      if (consecutive >= Math.max(3, Math.round(height * 0.2))) {
        right = x - consecutive + 1;
        break;
      }
    }
    target.fillStyle = 'black';
    const padding = Math.floor((rowHeight - (bottom - top)) / 2);
    for (let x = left; x < right; x++) {
      for (let y = top; y < bottom; y++) {
        const { light, chroma } = pixel(x, y);
        if (Math.abs(light - background) > 40 && chroma < 36) {
          target.fillRect((x - left + 6) * scale, (index * rowHeight + padding + y - top) * scale, scale, scale);
        }
      }
    }
  });
  return output;
}

async function screenshotCanvas(file) {
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 16000000) throw new Error('Crop the screenshot to the player list before importing.');
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}

export async function readScreenshot(file, format, onStatus) {
  const canvas = await screenshotCanvas(file);
  const engine = await loadEngine();
  let worker;
  let timer;
  let failWorker;
  let stopped = false;
  try {
    const failed = new Promise((resolve, reject) => { failWorker = reject; });
    const task = async () => {
      worker = await engine.createWorker('eng', 1, {
        workerPath: new URL('worker.min.js', assetRoot).href,
        corePath: new URL('tesseract-core-lstm.wasm.js', assetRoot).href,
        langPath: assetRoot.href.replace(/\/$/, ''),
        workerBlobURL: false,
        errorHandler: failWorker,
      });
      if (stopped) {
        await worker.terminate();
        return [];
      }
      onStatus('Reading names from the screenshot…');
      await worker.setParameters({ tessedit_pageseg_mode: engine.PSM.SINGLE_BLOCK });
      const { data } = await worker.recognize(canvas, {}, { blocks: format === 'voice', text: true });
      if (format === 'voice') {
        const lines = (data.blocks || []).flatMap(block => block.paragraphs.flatMap(paragraph => paragraph.lines));
        const rows = voiceRows(lines).slice(0, 64);
        if (rows.length) {
          const cleaned = await worker.recognize(cleanVoiceImage(canvas, rows));
          const names = signupCandidates(cleaned.data.text);
          if (names.length === rows.length) {
            return uniquePlayerNames(names.map((name, index) => rows[index].plain || name).join('\n'));
          }
          if (names.length) return names;
        }
        return [];
      }
      return signupCandidates(data.text);
    };
    const timeout = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('The screenshot took too long to read. Try a smaller crop.')), 45000);
    });
    return await Promise.race([task(), failed, timeout]);
  } finally {
    stopped = true;
    clearTimeout(timer);
    if (worker) await worker.terminate().catch(() => {});
  }
}
