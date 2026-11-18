"""Publish structured blog content to the shared content root."""
import json
import re
from typing import Literal
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ValidationError
from cms_core import storage

router = APIRouter()


class Entry(BaseModel):
    id: str = Field(min_length=1, max_length=180)


class Project(Entry):
    name: str = Field(min_length=1)
    description: str = ''
    icon: str = '🚀'
    githubUrl: str
    tags: list[str] = []


class Friend(Entry):
    name: str = Field(min_length=1)
    description: str = ''
    url: str
    avatar: str = ''
    themeColor: str = Field(default='#6366f1', pattern=r'^#[0-9A-Fa-f]{6}$')


class Photo(BaseModel):
    url: str
    caption: str = ''


class Album(Entry):
    title: str = Field(min_length=1)
    description: str = ''
    date: str
    cover: str = ''
    photos: list[Photo]


class Change(BaseModel):
    revision: str | None
    items: list[dict]


def check_url(value):
    parsed = urlsplit(value)
    if parsed.scheme not in ('http', 'https') or not parsed.hostname or re.search(r'[\s\\]', value):
        raise ValueError('请输入完整的 http 或 https 地址')


@router.post('/{kind}')
def publish(kind: Literal['projects', 'friends', 'albums'], change: Change):
    try:
        model = {'projects': Project, 'friends': Friend, 'albums': Album}[kind]
        rows = [model.model_validate(row).model_dump() for row in change.items]
        if len({row['id'] for row in rows}) != len(rows):
            raise ValueError('条目编号重复')
        for row in rows:
            for field in ('url', 'githubUrl', 'cover', 'avatar'):
                if field in row and (row[field] or field in ('url', 'githubUrl')):
                    check_url(row[field])
            for photo in row.get('photos', []):
                check_url(photo['url'])
        with storage.LOCK:
            path = storage.contained(storage.ROOT, f'collections/{kind}.json')
            if storage.revision(path) != change.revision:
                raise HTTPException(409, '其他页面已保存修改，请保留输入并刷新后再编辑')
            storage.atomic_write(path, json.dumps(rows, ensure_ascii=False, indent=2))
            return {'revision': storage.revision(path), 'items': rows}
    except ValidationError:
        raise HTTPException(422, '请检查名称、图片和其他必填字段')
    except ValueError as error:
        raise HTTPException(422, str(error))
    except OSError:
        raise HTTPException(500, '保存失败，请稍后重试')
