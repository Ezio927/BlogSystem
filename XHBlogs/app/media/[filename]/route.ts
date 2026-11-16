import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const types: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(filename)) return new Response(null, { status: 404 });
  const root = path.resolve(process.env.XHBLOGS_CONTENT_ROOT || process.cwd());
  const directory = path.join(root, 'media');
  const file = path.join(directory, filename);
  try {
    // Never follow a media-directory/file symlink into drafts or private configuration.
    if (await fs.realpath(directory) !== directory) return new Response(null, { status: 404 });
    const info = await fs.lstat(file);
    if (!info.isFile() || info.size > 8 * 1024 * 1024) return new Response(null, { status: 404 });
    const bytes = await fs.readFile(file);
    return new Response(new Uint8Array(bytes), { headers: {
      'Content-Type': types[filename.split('.').pop()!],
      'Content-Length': String(bytes.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    } });
  } catch (error) {
    if (['ENOENT', 'ENOTDIR', 'ELOOP'].includes((error as NodeJS.ErrnoException).code || '')) return new Response(null, { status: 404 });
    return new Response(null, { status: 500 });
  }
}
