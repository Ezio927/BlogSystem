"""Local authoring storage: contained paths, optimistic versions and recoverable writes."""
from contextlib import contextmanager
from pathlib import Path
import hashlib
import os
import re
import tempfile
import threading
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
LOCK = threading.RLock()


def contained(root, relative):
    root = Path(root)
    relative = Path(relative)
    if relative.is_absolute() or '..' in relative.parts:
        raise ValueError('路径必须位于本地项目内')
    candidate = root / relative
    path = root
    for part in ('', *relative.parts):
        path = path / part
        if path.is_symlink():
            raise ValueError('不允许符号链接路径')
    if not candidate.resolve().is_relative_to(root.resolve()):
        raise ValueError('路径越过项目目录')
    return candidate


def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r'[\w-]{1,180}', value, re.UNICODE):
        raise ValueError('无效文档 ID：仅允许字母、数字、下划线和连字符')
    return value


def doc_type(value):
    if value not in ('post', 'chatter', 'about'):
        raise ValueError('无效文档类型')
    return value


def article_path(value, kind):
    identifier(value)
    doc_type(kind)
    return contained(ROOT, 'app/about/about.md' if kind == 'about' else f'{"posts" if kind == "post" else "chatters"}/{value}.md')


def draft_path(value):
    return contained(ROOT, f'manager_data/drafts/{identifier(value)}.json')


def revision(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.exists() else None


def expect_revision(path, expected):
    if revision(path) != expected:
        raise ValueError('文件已被修改或同名文档已存在，请重新打开后保存；当前内容未覆盖')


def backup(path):
    if path.exists():
        recovery = contained(ROOT, f'manager_data/recovery/{uuid4().hex}/{path.name}')
        recovery.parent.mkdir(parents=True, exist_ok=True)
        recovery.write_bytes(path.read_bytes())
        return recovery


def atomic_write(path, content, recovery=True):
    # Callers validate all paths and hold LOCK through version check + replacement.
    path.parent.mkdir(parents=True, exist_ok=True)
    if recovery:
        backup(path)
    fd, temporary = tempfile.mkstemp(prefix='.manager-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(content if isinstance(content, bytes) else content.encode('utf-8'))
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def recover_delete(path):
    if path.exists():
        backup(path)
        path.unlink()
