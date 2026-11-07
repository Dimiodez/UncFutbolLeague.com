import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const assets = [
  ['tesseract.min.js', 'tesseract.js@7.0.0/dist/tesseract.min.js', '000c27d9cd0def655f77b36c72a389c0ab13793aa31cb4d7aab56d09c0afbc7e'],
  ['worker.min.js', 'tesseract.js@7.0.0/dist/worker.min.js', '576b7df7e3393e137e51849357c9adb53fe7ac1bb69bfa06cf3d61520f182c6d'],
  ['tesseract-core-lstm.wasm.js', 'tesseract.js-core@7.0.0/tesseract-core-lstm.wasm.js', 'eef5f8b2f8e20e150680b20adaec4a60babafee3adbe8a94583c81fee46e8680'],
  ['eng.traineddata.gz', '@tesseract.js-data/eng@1.0.0/4.0.0_best_int/eng.traineddata.gz', '45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91'],
  ['tesseract-license.txt', 'tesseract.js@7.0.0/LICENSE.md', 'b40930bbcf80744c86c46a12bc9da056641d722716c378f5659b9e555ef833e1'],
  ['core-license.txt', 'tesseract.js-core@7.0.0/LICENSE', 'c6596eb7be8581c18be736c846fb9173b69eccf6ef94c5135893ec56bd92ba08'],
  ['tesseract.min.js.LICENSE.txt', 'tesseract.js@7.0.0/dist/tesseract.min.js.LICENSE.txt', 'cdf963ced7d25a0f98901a547647b4d6e2dbe0197fd78c87a059a87b0e542fe2'],
  ['worker.min.js.LICENSE.txt', 'tesseract.js@7.0.0/dist/worker.min.js.LICENSE.txt', '45f54171aeaa1d10c0c1a66f374b7bba1f02472b1487fbe892eec04f840002ac'],
];
const mirrors = ['https://cdn.jsdelivr.net/npm/', 'https://unpkg.com/'];

async function verifiedAsset(path, hash) {
  for (const base of mirrors) {
    try {
      const response = await fetch(base + path, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (createHash('sha256').update(bytes).digest('hex') === hash) return bytes;
    } catch {
      // The other mirror must still match the same pinned digest.
    }
  }
  throw new Error('Unable to verify the wheel OCR asset: ' + path);
}

export async function buildWheelOcrAssets(output) {
  const files = await Promise.all(assets.map(async ([name, path, hash]) => [name, await verifiedAsset(path, hash)]));
  const directory = join(output, 'wheel-app', 'ocr-v7');
  await mkdir(directory, { recursive: true });
  await Promise.all(files.map(([name, bytes]) => writeFile(join(directory, name), bytes)));
  console.log('Verified and staged browser OCR assets.');
}
