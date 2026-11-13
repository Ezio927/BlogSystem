"""Explicit local copy into the fixed sibling XHBlogs, retaining recovery copies."""
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Request
from cms_core import storage as store

router = APIRouter()
SYNC_DIRS = ('posts', 'chatters', 'moments')
SYNC_FILES = ('app/about/about.md', 'data/albums.ts', 'data/friends.ts', 'data/projects.ts', 'data/petSelection.json', 'siteConfig.ts')


def target():
    path = store.ROOT.parent / 'XHBlogs'
    if path.is_symlink() or not path.is_dir() or not (path / 'package.json').is_file():
        raise ValueError('固定目标 ../XHBlogs 不存在或不是博客目录')
    return path


def validate_request(payload):
    fixed = target()
    supplied = payload.get('blogPath', '')
    if supplied and Path(supplied) != fixed:
        raise ValueError('只允许同步到同级 XHBlogs 目录')
    return fixed


@router.get('/config')
def config():
    return {'success': True, 'blogPath': str(store.ROOT.parent / 'XHBlogs')}


@router.post('/check')
async def check(request: Request):
    try:
        fixed = validate_request(await request.json())
        return {'success': True, 'message': f'固定同步目标：{fixed}'}
    except Exception as error:
        return {'success': False, 'message': str(error)}


@router.post('/execute')
async def execute(request: Request):
    recovery = None
    try:
        payload = await request.json()
        with store.LOCK:
            fixed = validate_request(payload)
            relatives = []
            for directory in SYNC_DIRS:
                folder = store.contained(store.ROOT, directory)
                if folder.exists():
                    # No directory deletion. Target-only files are deliberately retained.
                    relatives.extend(path.relative_to(store.ROOT) for path in folder.rglob('*') if path.is_file() or path.is_symlink())
            relatives.extend(Path(value) for value in SYNC_FILES if store.contained(store.ROOT, value).exists())
            # Validate every source and destination before the first mutation.
            plan = []
            for relative in relatives:
                src = store.contained(store.ROOT, relative)
                dst = store.contained(fixed, relative)
                content = src.read_bytes()
                if relative == Path('siteConfig.ts'):
                    content = '\n'.join(line for line in content.decode('utf-8').splitlines() if not any(key in line for key in ('picBedName:', 'picBedUrl:', 'picBedToken:'))).encode('utf-8')
                if not dst.exists() or dst.read_bytes() != content:
                    plan.append((relative, dst, content))
            recovery = store.contained(store.ROOT, 'manager_data/sync-recovery/' + uuid4().hex)
            recovery.mkdir(parents=True)
            manifest = []
            for relative, dst, content in plan:
                previous = recovery / relative
                if dst.exists():
                    previous.parent.mkdir(parents=True, exist_ok=True)
                    previous.write_bytes(dst.read_bytes())
                manifest.append(str(relative))
            (recovery / 'manifest.txt').write_text('\n'.join(manifest), encoding='utf-8')
            for relative, dst, content in plan:
                store.atomic_write(dst, content, recovery=False)
        return {'success': True, 'message': f'已同步 {len(plan)} 个文件到 XHBlogs；保留目标独有文件。恢复副本：{recovery}'}
    except Exception as error:
        suffix = f'；已保存恢复副本：{recovery}' if recovery else ''
        return {'success': False, 'message': f'同步失败：{error}{suffix}'}
