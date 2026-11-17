import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export const config = {
  port: Number(process.env.PORT) || 3000,
  dataDir: process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data'),
  mediaDir: path.join(ROOT, 'media'),
  webDir: path.join(ROOT, 'apps', 'web'),
  packages: {
    framework: path.join(ROOT, 'packages', 'framework', 'src'),
    ui: path.join(ROOT, 'packages', 'ui', 'src'),
  },
  sessionMaxAgeMs: 30 * 24 * 60 * 60 * 1000,
};
