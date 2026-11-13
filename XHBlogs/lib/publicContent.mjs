import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

/** Only published Markdown inside the two public collections is readable. */
export function readPublicMarkdown(collection, slug, root = process.env.XHBLOGS_CONTENT_ROOT || process.cwd()) {
  if (!['posts', 'chatters'].includes(collection) || typeof slug !== 'string' ||
      !/^[\p{L}\p{N}_-]+$/u.test(slug)) return null;
  const directory = path.resolve(root, collection);
  const filename = path.join(directory, `${slug}.md`);
  try {
    if (fs.realpathSync(directory) !== directory ||
        fs.lstatSync(filename).isSymbolicLink() || !fs.statSync(filename).isFile()) return null;
    const source = fs.readFileSync(filename, 'utf8');
    const { data } = matter(source);
    if (data.draft === true || data.draft === 'true') return null;
    return source;
  } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null;
    throw error;
  }
}

export function listPublicFiles(collection, root = process.env.XHBLOGS_CONTENT_ROOT || process.cwd()) {
  if (!['posts', 'chatters'].includes(collection)) return [];
  const directory = path.resolve(root, collection);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter(name => name.endsWith('.md') &&
    readPublicMarkdown(collection, name.slice(0, -3), root) !== null);
}
