from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import yaml
from cms_core import storage as store

router = APIRouter()


class MomentPayload(BaseModel):
    id: str
    date: str
    content: str
    location: Optional[str] = ''
    images: List[str] = []


@router.post('/save')
def save_moment(payload: MomentPayload):
    try:
        with store.LOCK:
            path = store.contained(store.ROOT, 'moments/' + store.identifier(payload.id) + '.md')
            # This screen creates new moments; updates require a dedicated editor.
            store.expect_revision(path, None)
            meta = {'id': payload.id, 'date': payload.date, 'location': payload.location, 'images': payload.images}
            store.atomic_write(path, '---\n' + yaml.safe_dump(meta, allow_unicode=True) + '---\n\n' + payload.content)
        return {'success': True, 'message': '说说已保存'}
    except Exception as error:
        return {'success': False, 'message': str(error)}


class DeletePayload(BaseModel):
    id: str


@router.post('/delete')
def delete_moment(payload: DeletePayload):
    try:
        with store.LOCK:
            path = store.contained(store.ROOT, 'moments/' + store.identifier(payload.id) + '.md')
            if not path.exists():
                raise ValueError('文件不存在')
            store.recover_delete(path)
        return {'success': True, 'message': '已删除，保留本地恢复副本'}
    except Exception as error:
        return {'success': False, 'message': str(error)}
