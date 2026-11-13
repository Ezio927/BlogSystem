import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readPublicMarkdown, listPublicFiles } from './publicContent.mjs';

function fixture(t, collections = ['posts', 'chatters']) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'xhb-public-')));
  for (const collection of collections) {
    fs.mkdirSync(path.join(root, collection), { recursive: true });
  }
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeFile(root, relative, source) {
  const filename = path.join(root, relative);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, source, 'utf8');
  return filename;
}

test('returns published Markdown for posts and chatters', (t) => {
  const root = fixture(t);
  const post = '---\ntitle: Hello\n---\n\nBody with **bold**.\n';
  const chatter = '---\ntitle: Note\n---\n\nA short note.\n';
  writeFile(root, 'posts/hello.md', post);
  writeFile(root, 'posts/my-post_1.md', post);
  writeFile(root, 'chatters/note.md', chatter);

  assert.equal(readPublicMarkdown('posts', 'hello', root), post);
  assert.equal(readPublicMarkdown('posts', 'my-post_1', root), post);
  assert.equal(readPublicMarkdown('chatters', 'note', root), chatter);
  assert.deepEqual(listPublicFiles('posts', root).sort(), ['hello.md', 'my-post_1.md']);
  assert.deepEqual(listPublicFiles('chatters', root).sort(), ['note.md']);
});

test('rejects missing, malformed, traversal and non-string slugs', (t) => {
  const root = fixture(t);
  writeFile(root, 'posts/ok.md', '---\ntitle: Ok\n---\nbody');
  writeFile(root, 'secret.md', 'top secret outside the collection');

  for (const slug of ['missing', '', ' ', 'has space', '../secret', 'sub/ok', '.', '..', 'ok.md']) {
    assert.equal(readPublicMarkdown('posts', slug, root), null, `slug ${JSON.stringify(slug)}`);
  }
  assert.equal(readPublicMarkdown('posts', 42, root), null);
  assert.equal(readPublicMarkdown('posts', null, root), null);
  assert.equal(readPublicMarkdown('posts', undefined, root), null);
  assert.deepEqual(listPublicFiles('posts', root), ['ok.md']);
});

test('rejects unknown collections', (t) => {
  const root = fixture(t);
  writeFile(root, 'posts/ok.md', '---\ntitle: Ok\n---\nbody');

  for (const collection of ['pages', 'drafts', '', 'POSTS', '../posts']) {
    assert.equal(readPublicMarkdown(collection, 'ok', root), null, collection);
    assert.deepEqual(listPublicFiles(collection, root), [], collection);
  }
});

test('returns empty results when the collection directory is absent', (t) => {
  const root = fixture(t, []);

  assert.equal(readPublicMarkdown('posts', 'anything', root), null);
  assert.deepEqual(listPublicFiles('posts', root), []);
  assert.deepEqual(listPublicFiles('chatters', root), []);
});

test('accepts Chinese and other Unicode slugs', (t) => {
  const root = fixture(t);
  const source = '---\ntitle: 中文\n---\n\n正文。\n';
  writeFile(root, 'posts/中文标题.md', source);
  writeFile(root, 'chatters/闲聊-1.md', source);

  assert.equal(readPublicMarkdown('posts', '中文标题', root), source);
  assert.equal(readPublicMarkdown('chatters', '闲聊-1', root), source);
  assert.deepEqual(listPublicFiles('posts', root), ['中文标题.md']);
  assert.deepEqual(listPublicFiles('chatters', root), ['闲聊-1.md']);
});

test('does not expose boolean or string draft:true in reads or listings', (t) => {
  const root = fixture(t);
  writeFile(root, 'posts/published.md', '---\ntitle: P\n---\npublic');
  writeFile(root, 'posts/boolean-draft.md', '---\ndraft: true\n---\nhidden');
  writeFile(root, 'posts/string-draft.md', '---\ndraft: "true"\n---\nhidden');
  writeFile(root, 'chatters/single-quoted.md', "---\ndraft: 'true'\n---\nhidden");
  writeFile(root, 'chatters/live.md', '---\ndraft: false\n---\nlive');

  for (const slug of ['boolean-draft', 'string-draft']) {
    assert.equal(readPublicMarkdown('posts', slug, root), null, slug);
  }
  assert.equal(readPublicMarkdown('chatters', 'single-quoted', root), null);
  assert.deepEqual(listPublicFiles('posts', root), ['published.md']);
  assert.deepEqual(listPublicFiles('chatters', root), ['live.md']);
});

test('does not expose a draft folder as a collection or through nested paths', (t) => {
  const root = fixture(t);
  writeFile(root, 'posts/drafts/secret.md', '---\ntitle: Secret\n---\nhidden');
  writeFile(root, 'drafts/hidden.md', '---\ntitle: Hidden\n---\nhidden');
  writeFile(root, 'posts/visible.md', '---\ntitle: Visible\n---\nvisible');

  assert.equal(readPublicMarkdown('drafts', 'hidden', root), null);
  assert.deepEqual(listPublicFiles('drafts', root), []);
  assert.equal(readPublicMarkdown('posts', 'drafts/secret', root), null);
  assert.equal(readPublicMarkdown('posts', 'secret', root), null);
  assert.deepEqual(listPublicFiles('posts', root), ['visible.md']);
});

test('rejects a symlinked Markdown file', (t) => {
  const root = fixture(t);
  const real = writeFile(root, 'outside/real.md', '---\ntitle: Real\n---\nreal');
  fs.symlinkSync(real, path.join(root, 'posts', 'sneaky.md'), 'file');

  assert.equal(readPublicMarkdown('posts', 'sneaky', root), null);
  assert.deepEqual(listPublicFiles('posts', root), []);
});

test('rejects a collection directory that is a symlink', (t) => {
  const root = fixture(t, []);
  const realPosts = path.join(root, 'real-posts');
  fs.mkdirSync(realPosts);
  fs.writeFileSync(path.join(realPosts, 'hello.md'), '---\ntitle: Hello\n---\nhello');
  fs.symlinkSync(realPosts, path.join(root, 'posts'), 'dir');
  fs.mkdirSync(path.join(root, 'chatters'));

  assert.equal(readPublicMarkdown('posts', 'hello', root), null);
  assert.deepEqual(listPublicFiles('posts', root), []);
});

test('rejects a symlinked directory entry inside a collection', (t) => {
  const root = fixture(t);
  const realDir = path.join(root, 'outside-dir');
  fs.mkdirSync(realDir);
  fs.writeFileSync(path.join(realDir, 'a.md'), '---\ntitle: A\n---\na');
  fs.symlinkSync(realDir, path.join(root, 'posts', 'linked.md'), 'dir');

  assert.equal(readPublicMarkdown('posts', 'linked', root), null);
  assert.deepEqual(listPublicFiles('posts', root), []);
});

test('reads reflect edits without restarting the process', (t) => {
  const root = fixture(t);
  writeFile(root, 'posts/live.md', '---\ntitle: v1\n---\nfirst');
  assert.equal(readPublicMarkdown('posts', 'live', root), '---\ntitle: v1\n---\nfirst');
  assert.deepEqual(listPublicFiles('posts', root), ['live.md']);

  writeFile(root, 'posts/live.md', '---\ntitle: v2\n---\nsecond');
  assert.equal(readPublicMarkdown('posts', 'live', root), '---\ntitle: v2\n---\nsecond');

  writeFile(root, 'posts/live.md', '---\ndraft: true\n---\nthird');
  assert.equal(readPublicMarkdown('posts', 'live', root), null);
  assert.deepEqual(listPublicFiles('posts', root), []);

  writeFile(root, 'posts/live.md', '---\ndraft: false\n---\nfourth');
  assert.equal(readPublicMarkdown('posts', 'live', root), '---\ndraft: false\n---\nfourth');
  assert.deepEqual(listPublicFiles('posts', root), ['live.md']);
});

test('excludes non-Markdown files from listings', (t) => {
  const root = fixture(t);
  writeFile(root, 'posts/real.md', '---\ntitle: R\n---\nr');
  writeFile(root, 'posts/notes.txt', 'plain text');
  writeFile(root, 'posts/image.png', 'not really an image');
  writeFile(root, 'posts/other.markdown', '---\ntitle: O\n---\no');
  writeFile(root, 'posts/UPPER.MD', '---\ntitle: U\n---\nu');
  writeFile(root, 'posts/.hidden.md', '---\ntitle: Hidden\n---\nh');

  assert.deepEqual(listPublicFiles('posts', root), ['real.md']);
});
