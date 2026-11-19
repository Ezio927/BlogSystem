import unittest
from tempfile import TemporaryDirectory
from pathlib import Path
from unittest.mock import patch
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'my-blog-manager'))
from fastapi.testclient import TestClient
from cms_core import storage
from cms_core.main import app


class CollectionsTest(unittest.TestCase):
    def test_publish_and_reject_stale_or_invalid_changes(self):
        with TemporaryDirectory() as tmp, patch.object(storage, 'ROOT', Path(tmp)), TestClient(
            app, base_url='http://localhost:3402', headers={'Origin': 'http://localhost:3401'}
        ) as client:
            for kind, fields in [('friends', {'name': 'F', 'url': 'https://example.org'}),
                                 ('projects', {'name': 'P', 'githubUrl': 'https://github.com'}),
                                 ('albums', {'title': 'A', 'date': '2026-11-18', 'photos': []})]:
                url = '/api/collections/' + kind
                change = {'revision': None, 'items': [{'id': 'one', **fields}]}
                result = client.post(url, json=change)
                self.assertEqual(result.status_code, 200, result.text)
                self.assertEqual(client.post(url, json=change).status_code, 409)
                change['revision'] = result.json()['revision']
                invalid = dict(change, items=[{}])
                self.assertEqual(client.post(url, json=invalid).status_code, 422)
                self.assertEqual(client.post(url, json=change, headers={'Origin': 'null'}).status_code, 403)
                self.assertEqual(client.post(url, json=dict(change, items=[])).status_code, 200)
            self.assertEqual(len(list((Path(tmp)/'manager_data/recovery').glob('*/*.json'))), 3)
