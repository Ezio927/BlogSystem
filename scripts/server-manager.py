#!/usr/bin/env python3
"""Supervise this release's two loopback-only production authoring processes."""
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time


def main():
    release = Path(__file__).resolve().parent
    root = Path.home() / 'apps/ezio-blog'
    content = root / 'content'
    node = Path(os.environ['EZIO_MANAGER_NODE'])
    python = root / 'manager-venv/bin/python'
    if not (content / 'posts').is_dir() or not (content / 'manager_data').is_dir():
        raise RuntimeError('Migrate and verify the persistent content before starting the manager.')
    for port in (3401, 3402):
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', port))
    env = {**os.environ, 'EZIO_CMS_ROOT': str(content), 'XHBLOGS_CONTENT_ROOT': str(content),
           'EZIO_CMS_MODE': 'server', 'EZIO_CMS_PUBLIC_URL': 'https://47.101.37.232/blog',
           'HOSTNAME': '127.0.0.1', 'PORT': '3401', 'NODE_ENV': 'production'}
    children = []
    def stop(_signum, _frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        for args in ([str(python), '-m', 'uvicorn', 'cms_core.main:app', '--host', '127.0.0.1', '--port', '3402'],
                     [str(node), str(release / 'server.js')]):
            children.append(subprocess.Popen(args, cwd=release, env=env, start_new_session=True))
        print('Private manager ready: server loopback 3401/3402; SSH forwarding required.', flush=True)
        while all(child.poll() is None for child in children):
            time.sleep(0.5)
        raise RuntimeError('An authoring process exited; see manager.log.')
    except KeyboardInterrupt:
        pass
    finally:
        for child in children:
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGTERM)
        for child in children:
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Private manager stopped: {error}', file=sys.stderr)
        sys.exit(1)
