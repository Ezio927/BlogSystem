"""Draft JSON remains private; published Markdown is the authoring source."""
import json
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


@router.post('/sync_local')
async def publish(request: Request):
    try:
        payload = await request.json()
        operations = payload.get('operations', [])
        if len(operations) != 1 or operations[0].get('type') != 'publish_article':
            raise ValueError('每次仅支持发布一个文档')
        data = operations[0].get('value', {})
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
            store.recover_delete(draft)
            return {'success': True, 'message': '已发布到本地源文件；同步 XHBlogs 后可更新博客', 'id': value, 'revision': None, 'sourceRevision': store.revision(source)}
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
