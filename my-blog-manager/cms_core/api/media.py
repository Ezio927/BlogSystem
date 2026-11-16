"""Private uploads; sanitized, immutable images live beside persistent articles."""
from io import BytesIO
import os
import warnings
from uuid import uuid4
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from cms_core import storage as store

router = APIRouter()
MAX_BYTES = 8 * 1024 * 1024
MAX_PIXELS = 16_000_000
FORMATS = {'JPEG': ('jpg', 'image/jpeg'), 'PNG': ('png', 'image/png'), 'WEBP': ('webp', 'image/webp')}


@router.post('/upload')
async def upload(file: UploadFile = File(...)):
    try:
        raw = await file.read(MAX_BYTES + 1)
        if not raw or len(raw) > MAX_BYTES:
            return JSONResponse({'success': False, 'message': '图片不能为空，且大小不能超过 8 MB'}, status_code=413)
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(BytesIO(raw)) as source:
                kind = source.format
                if kind not in FORMATS:
                    raise ValueError('仅支持 JPEG、PNG、WebP 图片')
                if source.width * source.height > MAX_PIXELS:
                    raise ValueError('图片不能超过 1600 万像素，请缩小后上传')
                if getattr(source, 'n_frames', 1) != 1:
                    raise ValueError('请使用静态图片，不支持动画图片')
                source.load()
                # Apply camera orientation, then strip EXIF/GPS and all other metadata.
                pixels = ImageOps.exif_transpose(source).convert('RGB' if kind == 'JPEG' else 'RGBA')
                clean = Image.new(pixels.mode, pixels.size)
                clean.paste(pixels)
                output = BytesIO()
                clean.save(output, format=kind, **({'quality': 90} if kind in ('JPEG', 'WEBP') else {}))
                data = output.getvalue()
        if len(data) > MAX_BYTES:
            raise ValueError('处理后图片超过 8 MB，请缩小后上传')
        name = uuid4().hex + '.' + FORMATS[kind][0]
        with store.LOCK:
            target = store.contained(store.ROOT, 'media/' + name)
            if target.exists():
                raise OSError('Image name collision')
            store.atomic_write(target, data, recovery=False)
        base = os.environ.get('EZIO_CMS_PUBLIC_URL', 'http://127.0.0.1:3401').rstrip('/')
        return {'success': True, 'url': base + '/media/' + name, 'message': '图片已保存到博客服务器'}
    except (ValueError, UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        return JSONResponse({'success': False, 'message': '图片无效或不受支持，请使用不超过 1600 万像素的静态 JPEG、PNG、WebP'}, status_code=400)
    except OSError:
        return JSONResponse({'success': False, 'message': '图片读取或保存失败，请重试；原封面未修改'}, status_code=500)
    finally:
        await file.close()
