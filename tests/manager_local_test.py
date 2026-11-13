"""All CMS write tests use isolated temporary manager and sibling blog directories."""
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'my-blog-manager'))
from fastapi.testclient import TestClient
from cms_core import storage
from cms_core.main import app

ORIGIN = {'Origin': 'http://127.0.0.1:3401'}


class LocalManagerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.manager = Path(self.temp.name) / 'my-blog-manager'
        self.blog = Path(self.temp.name) / 'XHBlogs'
        for folder in (self.manager, self.blog):
            folder.mkdir()
        (self.blog / 'package.json').write_text('{}')
        self.patch = patch.object(storage, 'ROOT', self.manager)
        self.patch.start()
        self.client = TestClient(app, base_url='http://127.0.0.1:3402', headers=ORIGIN)

    def tearDown(self):
        self.client.close()
        self.patch.stop()
        self.temp.cleanup()

    def post(self, path, data):
        response = self.client.post('/api/' + path, json=data)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def save(self, **extra):
        result = self.post('drafts/save', {'title': '测试', 'content': '<p>正文</p>', 'type': 'post', **extra})
        self.assertTrue(result['success'], result)
        return result

    def test_save_reopen_update_stale_and_recovery(self):
        first = self.save()
        reopened = self.post('drafts/get', {'id': first['id']})['draft']
        self.assertEqual(reopened['content'], '<p>正文</p>')
        second = self.save(**{**reopened, 'content': '<p>修改</p>'})
        self.assertEqual(first['id'], second['id'])
        self.assertFalse(self.post('drafts/save', reopened)['success'])
        final = self.post('drafts/get', {'id': first['id']})['draft']
        self.assertEqual(final['content'], '<p>修改</p>')
        self.assertTrue(list((self.manager / 'manager_data/recovery').rglob('*.json')))

    def test_publish_reopen_update_and_collision(self):
        first = self.save(title='测试 --- 标题')
        data = self.post('drafts/get', {'id': first['id']})['draft']
        publish = lambda value: self.post('drafts/sync_local', {'operations': [{'type': 'publish_article', 'value': value}]})
        self.assertTrue(publish(data)['success'])
        source = self.manager / 'posts' / (first['id'] + '.md')
        self.assertIn('正文', source.read_text())
        self.assertFalse(storage.draft_path(first['id']).exists())
        reopened = self.post('drafts/get', {'id': first['id'], 'type': 'post'})['draft']
        self.assertIn('<p>正文</p>', reopened['content'])
        self.assertEqual(reopened['title'], '测试 --- 标题')
        saved = self.save(**{**reopened, 'content': '<p>第二版</p>'})
        update = {**reopened, 'content': '<p>第二版</p>', 'revision': saved['revision']}
        self.assertTrue(publish(update)['success'])
        self.assertIn('第二版', source.read_text())
        self.assertFalse(publish(update)['success'])
        self.assertFalse(self.post('drafts/save', {'id': first['id'], 'type': 'post'})['success'])

    def test_paths_types_and_directory_symlink(self):
        for value in ('../escape', '/tmp/escape', 'a/b', 'a\\b', '.', ''):
            self.assertFalse(self.post('drafts/get', {'id': value})['success'])
        self.assertFalse(self.post('drafts/save', {'id': 'x', 'type': 'unknown'})['success'])
        outside = self.manager.parent / 'outside'
        outside.mkdir()
        (self.manager / 'posts').symlink_to(outside, target_is_directory=True)
        self.assertFalse(self.post('drafts/save', {'id': 'x', 'type': 'post'})['success'])
        self.assertFalse(self.post('moments/save', {'id': '../escape', 'date': '', 'content': 'x'})['success'])
        self.assertEqual(list(outside.iterdir()), [])

    def test_source_file_symlink(self):
        (self.manager / 'posts').mkdir()
        outside = self.manager.parent / 'outside.md'
        outside.write_text('private')
        (self.manager / 'posts/x.md').symlink_to(outside)
        self.assertFalse(self.post('drafts/get', {'id': 'x'})['success'])
        self.assertEqual(outside.read_text(), 'private')

    def test_origin_host_and_removed_routes(self):
        for headers in ({'Origin': 'https://evil.example'}, {'Origin': 'null'}, {'Origin': ''}, {**ORIGIN, 'Host': 'evil.example:3402'}):
            response = self.client.post('/api/drafts/save', json={'type': 'post'}, headers=headers)
            self.assertEqual(response.status_code, 403)
            self.assertFalse(response.json()['success'])
        for route in ('/api/deploy/config', '/api/briefing/status', '/api/briefing/agent/connect', '/api/music/query/1'):
            self.assertEqual(self.client.get(route).status_code, 404)
        response = self.client.options('/api/drafts/save', headers={**ORIGIN, 'Access-Control-Request-Method': 'POST'})
        self.assertEqual(response.headers.get('access-control-allow-origin'), ORIGIN['Origin'])
        self.assertFalse((self.manager / 'manager_data').exists())

    def test_fixed_sync_target_only_and_recovery(self):
        for folder in (self.manager / 'posts', self.blog / 'posts'):
            folder.mkdir()
        (self.manager / 'posts/shared.md').write_text('new')
        (self.blog / 'posts/shared.md').write_text('old')
        (self.blog / 'posts/target-only.md').write_text('keep')
        result = self.post('sync/execute', {})
        self.assertTrue(result['success'], result)
        self.assertEqual((self.blog / 'posts/shared.md').read_text(), 'new')
        self.assertEqual((self.blog / 'posts/target-only.md').read_text(), 'keep')
        backup = list((self.manager / 'manager_data/sync-recovery').rglob('shared.md'))
        self.assertEqual(len(backup), 1)
        self.assertEqual(backup[0].read_text(), 'old')
        self.assertFalse(self.post('sync/execute', {'blogPath': str(self.manager.parent)})['success'])

    def test_sync_preflight_source_and_target_symlinks(self):
        for folder in (self.manager / 'posts', self.blog / 'posts'):
            folder.mkdir()
        (self.manager / 'posts/a.md').write_text('new')
        (self.blog / 'posts/a.md').write_text('old')
        outside = self.manager.parent / 'outside.md'
        outside.write_text('secret')
        (self.manager / 'posts/z.md').symlink_to(outside)
        self.assertFalse(self.post('sync/execute', {})['success'])
        self.assertEqual((self.blog / 'posts/a.md').read_text(), 'old')
        (self.manager / 'posts/z.md').unlink()
        (self.blog / 'posts/z.md').symlink_to(outside)
        (self.manager / 'posts/z.md').write_text('x')
        self.assertFalse(self.post('sync/execute', {})['success'])
        self.assertEqual(outside.read_text(), 'secret')

    def test_draft_delete_retains_published_source(self):
        first = self.save(id='same')
        (self.manager / 'posts').mkdir()
        source = self.manager / 'posts/same.md'
        source.write_text('keep published')
        self.assertTrue(self.post('drafts/delete', {'id': first['id']})['success'])
        self.assertEqual(source.read_text(), 'keep published')


if __name__ == '__main__':
    unittest.main()
