#!/usr/bin/env python3
"""Run the browser authoring console and Python API on fixed loopback ports."""
from pathlib import Path
import json
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1] / 'my-blog-manager'


def main():
    python = ROOT / '.venv/bin/python'
    next_bin = ROOT / 'node_modules/next/dist/bin/next'
    if not python.is_file() or not next_bin.is_file():
        raise RuntimeError('Run bash scripts/local-manager-setup.sh first (Python 3.10+, Node.js 20.9+).')
    for port in (3401, 3402):
        with socket.socket() as probe:
            try:
                probe.bind(('127.0.0.1', port))
            except OSError as error:
                raise RuntimeError(f'Port {port} is occupied; stop that process before starting the manager.') from error
    config = ROOT / 'public/backend_config.json'
    if config.is_symlink():
        raise RuntimeError('backend_config.json must not be a symlink')
    temporary = config.with_suffix('.json.tmp')
    temporary.write_text(json.dumps({'api_port': 3402}), encoding='utf-8')
    temporary.replace(config)
    children = []
    try:
        for args in ([str(python), '-m', 'uvicorn', 'cms_core.main:app', '--host', '127.0.0.1', '--port', '3402'],
                     ['node', str(next_bin), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3401']):
            children.append(subprocess.Popen(args, cwd=ROOT, start_new_session=True))
        print('Local authoring console: http://127.0.0.1:3401 (Ctrl+C stops both servers)', flush=True)
        print('Save a draft → publish to the queue → 更新本地 → 同步 XHBlogs. ECS deployment is separate.', flush=True)
        while True:
            for child in children:
                if child.poll() is not None:
                    raise RuntimeError(f'Server exited with code {child.returncode}; see terminal output above.')
            time.sleep(0.4)
    except KeyboardInterrupt:
        pass
    finally:
        for child in children:
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGTERM)
        for child in children:
            try:
                child.wait(timeout=8)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Local manager startup failed: {error}', file=sys.stderr)
        sys.exit(1)
