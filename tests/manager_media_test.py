"""Uploads use only temporary content; no real credentials or blog articles."""
import io
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'my-blog-manager'))
from fastapi.testclient import TestClient
from PIL import Image
from cms_core import storage
from cms_core.api import media
from cms_core.main import app


class MediaTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / 'content'
        self.root.mkdir()
        self.patch = patch.object(storage, 'ROOT', self.root)
        self.patch.start()
        self.env = patch.dict(os.environ, {'EZIO_CMS_PUBLIC_URL': 'https://blog.example/blog', 'EZIO_CMS_MODE': 'server'})
        self.env.start()
        self.client = TestClient(app, base_url='http://127.0.0.1:3402', headers={'Origin': 'http://127.0.0.1:3401'})

    def tearDown(self):
        self.client.close()
        self.env.stop()
        self.patch.stop()
        self.temp.cleanup()

    def image(self, kind='PNG'):
        output = io.BytesIO()
        im = Image.new('RGB', (32, 24), 'purple')
        exif = Image.Exif()
        exif[270] = 'PRIVATE_METADATA'
        im.save(output, format=kind, exif=exif)
        return output.getvalue()

    def upload(self, raw, name='../../same.jpg', **kwargs):
        return self.client.post('/api/media/upload', files={'file': (name, raw, 'image/jpeg')}, **kwargs)

    def test_formats_metadata_names_and_persistence(self):
        urls = []
        for kind, suffix in [('PNG', 'png'), ('JPEG', 'jpg'), ('WEBP', 'webp')]:
            for _ in range(2):
                response = self.upload(self.image(kind))
                self.assertEqual(response.status_code, 200, response.text)
                url = response.json()['url']
                self.assertTrue(url.startswith('https://blog.example/blog/media/'))
                urls.append(url)
                path = self.root / 'media' / url.rsplit('/', 1)[1]
                self.assertEqual(path.suffix, '.' + suffix)
                self.assertNotIn(b'PRIVATE_METADATA', path.read_bytes())
                with Image.open(path) as image:
                    self.assertEqual(image.size, (32, 24))
                    self.assertEqual(len(image.getexif()), 0)
        self.assertEqual(len(set(urls)), 6)
        self.assertEqual(len(list((self.root / 'media').iterdir())), 6)
        self.assertFalse((self.root.parent / 'same.jpg').exists())

    def test_invalid_oversize_and_pixels(self):
        for raw in (b'<svg onload="alert(1)"/>', b'not an image', self.image('GIF')):
            self.assertEqual(self.upload(raw).status_code, 400)
        self.assertEqual(self.upload(b'').status_code, 413)
        with patch.object(media, 'MAX_BYTES', 20):
            self.assertEqual(self.upload(self.image()).status_code, 413)
        with patch.object(media, 'MAX_PIXELS', 20):
            self.assertEqual(self.upload(self.image()).status_code, 400)
        self.assertFalse((self.root / 'media').exists())

    def test_origin_symlink_and_failed_write(self):
        raw = self.image()
        for origin in ['', 'null', 'https://evil.example']:
            self.assertEqual(self.upload(raw, headers={'Origin': origin}).status_code, 403)
        outside = self.root.parent / 'outside'
        outside.mkdir()
        (self.root / 'media').symlink_to(outside, target_is_directory=True)
        self.assertEqual(self.upload(raw).status_code, 400)
        self.assertEqual(list(outside.iterdir()), [])
        (self.root / 'media').unlink()
        with patch.object(storage, 'atomic_write', side_effect=OSError('disk full')):
            response = self.upload(raw)
        self.assertEqual(response.status_code, 500)
        self.assertFalse(response.json()['success'])
        self.assertNotIn('disk full', response.text)
        self.assertFalse((self.root / 'media').exists())


if __name__ == '__main__':
    unittest.main()
