"""Draft JSON remains private; published Markdown is the authoring source."""
import json
import hashlib
import os
from urllib.parse import quote
import re
import time
from datetime import datetime
from uuid import uuid4
import yaml
from fastapi import APIRouter, Request
from cms_core import storage as store
from cms_core.content import editor_html_to_markdown, markdown_to_editor_html

router = APIRouter()


def normalize_id(value):
    if isinstance(value, str):
        value = value.removesuffix('.md').removesuffix('.json')
    return store.identifier(value)


def parse_article(text):
    match = re.match(r'\A---\r?\n(.*?)\r?\n---(?:\r?\n|$)', text, re.DOTALL)
    return ((yaml.safe_load(match.group(1)) or {}), text[match.end():]) if match else ({}, text)


def draft_data(path):
    data = json.loads(path.read_text(encoding='utf-8'))
    data['revision'] = store.revision(path)
    return data


@router.post('/save')
async def save_draft(request: Request):
    try:
        payload = await request.json()
        with store.LOCK:
            kind = store.doc_type(payload.get('type', 'post'))
            value = 'about' if kind == 'about' else payload.get('id')
            if not value or value == 'new':
                value = 'draft_' + uuid4().hex
            value = normalize_id(value)
            path = store.draft_path(value)
            source = store.article_path(value, kind)
            store.expect_revision(path, payload.get('revision'))
            store.expect_revision(source, payload.get('sourceRevision'))
            fields = ('title', 'description', 'content', 'cover', 'tags', 'mood', 'date')
            data = {field: payload.get(field, [] if field == 'tags' else '') for field in fields}
            data.update(id=value, type=kind, lastModified=int(time.time() * 1000), sourceRevision=payload.get('sourceRevision'))
            store.atomic_write(path, json.dumps(data, ensure_ascii=False, indent=2))
            return {'success': True, 'message': '草稿已保存', 'id': value, 'revision': store.revision(path), 'sourceRevision': data['sourceRevision']}
    except Exception as error:
        return {'success': False, 'message': str(error)}


@router.post('/list')
async def list_drafts(request: Request):
    try:
        directory = store.contained(store.ROOT, 'manager_data/drafts')
        drafts = []
        for path in directory.glob('*.json'):
            store.contained(store.ROOT, path.relative_to(store.ROOT))
            data = draft_data(path)
            data['contentPreview'] = data.pop('content', '')[:100]
            drafts.append(data)
        drafts.sort(key=lambda item: item.get('lastModified', 0), reverse=True)
        return {'success': True, 'drafts': drafts}
    except Exception as error:
        return {'success': False, 'message': str(error)}


@router.post('/get')
async def get_draft(request: Request):
    try:
        payload = await request.json()
        value = normalize_id(payload.get('id', ''))
        kind = store.doc_type(payload.get('type', 'post'))
        with store.LOCK:
            path = store.draft_path(value)
            if path.exists():
                return {'success': True, 'draft': draft_data(path)}
            source = store.article_path(value, kind)
            text = source.read_text(encoding='utf-8')
            meta, body = parse_article(text)
            data = {field: meta.get(field, [] if field == 'tags' else '') for field in ('title', 'description', 'cover', 'tags', 'mood', 'date')}
            data.update(id=value, type=kind, content=markdown_to_editor_html(body.strip()), revision=None, sourceRevision=store.revision(source))
            return {'success': True, 'draft': data}
    except Exception as error:
        return {'success': False, 'message': f'读取失败: {error}'}


@router.post('/delete')
async def delete_draft(request: Request):
    try:
        payload = await request.json()
        value = normalize_id(payload.get('id', ''))
        # Drafts screen deletes only its private JSON, never a published namesake.
        with store.LOCK:
            path = store.draft_path(value)
            if not path.exists():
                raise ValueError('未找到草稿')
            store.recover_delete(path)
        return {'success': True, 'message': '草稿已移至本地恢复副本'}
    except Exception as error:
        return {'success': False, 'message': str(error)}


def published_url(value, kind):
    base = os.environ.get('EZIO_CMS_PUBLIC_URL', 'https://47.101.37.232/blog').rstrip('/')
    route = '/about' if kind == 'about' else ('/posts/' if kind == 'post' else '/chatter/') + quote(value, safe='')
    return base + route


def publish_document(data):
    with store.LOCK:
        kind = store.doc_type(data.get('type', 'post'))
        value = 'about' if kind == 'about' else data.get('id')
        if not value or value == 'new':
            value = 'post_' + uuid4().hex
        value = normalize_id(value)
        source = store.article_path(value, kind)
        draft = store.draft_path(value)
        store.expect_revision(source, data.get('sourceRevision'))
        store.expect_revision(draft, data.get('revision'))
        meta = {key: data.get(key, [] if key == 'tags' else '') for key in ('title', 'tags', 'mood', 'cover', 'description')}
        date = str(data.get('date') or datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        meta['date'] = date
        text = '---\n' + yaml.safe_dump(meta, allow_unicode=True, sort_keys=False) + '---\n\n' + editor_html_to_markdown(data.get('content', ''))
        store.atomic_write(source, text)
        # Replacing the public source commits publication. Cleanup cannot undo it.
        committed_revision = hashlib.sha256(text.encode('utf-8')).hexdigest()
        warning = None
        draft_conflict = False
        draft_revision = data.get('revision')
        try:
            store.expect_revision(source, committed_revision)
            store.expect_revision(draft, data.get('revision'))
            store.recover_delete(draft)
            draft_revision = None
        except Exception as error:
            warning = f'公开内容已发布，但草稿清理失败：{error}。'
            try:
                draft_revision = store.revision(draft)
                if draft.exists():
                    # Rebase only our unchanged, identical draft onto our committed source.
                    # A concurrent change to either file must still cause a save conflict.
                    store.expect_revision(draft, data.get('revision'))
                    store.expect_revision(source, committed_revision)
                    retained = json.loads(draft.read_text(encoding='utf-8'))
                    fields = ('type', 'title', 'description', 'content', 'cover', 'tags', 'mood', 'date')
                    if any(retained.get(key, [] if key == 'tags' else '') != data.get(key, [] if key == 'tags' else '') for key in fields):
                        raise ValueError('保留的草稿与本次发布内容不同')
                    retained['sourceRevision'] = committed_revision
                    store.atomic_write(draft, json.dumps(retained, ensure_ascii=False, indent=2), recovery=False)
                    draft_revision = store.revision(draft)
                    warning += '草稿已保留并更新版本，可以继续编辑。'
            except Exception as error:
                draft_conflict = True
                warning += f'草稿版本未能更新，请重新打开并核实内容：{error}。'
        return {'success': True, 'message': '已发布，公网博客可立即读取' if store.server_mode() else '已发布到本地源文件；同步 XHBlogs 后可更新博客', 'id': value, 'revision': draft_revision, 'sourceRevision': committed_revision, 'publishedURL': published_url(value, kind), 'warning': warning, 'draftConflict': draft_conflict}


@router.post('/publish')
async def publish_direct(request: Request):
    try:
        return publish_document(await request.json())
    except Exception as error:
        return {'success': False, 'message': str(error)}


@router.post('/sync_local')
async def publish(request: Request):
    try:
        payload = await request.json()
        operations = payload.get('operations', [])
        if len(operations) != 1 or operations[0].get('type') != 'publish_article':
            raise ValueError('每次仅支持发布一个文档')
        return publish_document(operations[0].get('value', {}))
    except Exception as error:
        return {'success': False, 'message': str(error)}


@router.get('/all_tags')
async def all_tags():
    collections = {'post': set(), 'chatter': set()}
    for kind, directory in [('post', 'posts'), ('chatter', 'chatters')]:
        for path in store.contained(store.ROOT, directory).glob('*.md'):
            try:
                store.contained(store.ROOT, path.relative_to(store.ROOT))
                text = path.read_text(encoding='utf-8')
                meta, _ = parse_article(text)
                tags = meta.get('tags', [])
                collections[kind].update(str(tag) for tag in (tags if isinstance(tags, list) else [tags]))
            except (ValueError, IndexError, OSError):
                continue
    return {'success': True, 'postTags': sorted(collections['post']), 'chatterTags': sorted(collections['chatter'])}
