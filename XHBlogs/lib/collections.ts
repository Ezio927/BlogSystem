import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { projectsData } from '../data/projects';
import { albums } from '../data/albums';
import { friendsData } from '../data/friends';

const defaults = { projects: projectsData, albums, friends: friendsData };

export function readCollection<K extends keyof typeof defaults>(kind: K) {
  const file = path.resolve(process.env.XHBLOGS_CONTENT_ROOT || process.cwd(), 'collections', kind + '.json');
  try {
    if (fs.realpathSync(file) !== file) throw new Error('Invalid collection path');
    const bytes = fs.readFileSync(file);
    const items = JSON.parse(bytes.toString('utf8')) as typeof defaults[K];
    return { items, revision: createHash('sha256').update(bytes).digest('hex') };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    return { items: defaults[kind], revision: null };
  }
}
