"use client";

import { useEffect, useState } from 'react';
import { useToast } from '../ToastProvider';

export default function RepoSection() {
  const [blogPath, setBlogPath] = useState('');
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  useEffect(() => {
    async function load() {
      try {
        const config = await (await fetch('/backend_config.json', { cache: 'no-store' })).json();
        const data = await (await fetch(`http://127.0.0.1:${config.api_port}/api/sync/config`)).json();
        setBlogPath(data.blogPath);
      } catch { showToast('无法连接本地后台', 'error'); }
    }
    void load();
  }, [showToast]);
  async function sync() {
    setBusy(true);
    try {
      const config = await (await fetch('/backend_config.json', { cache: 'no-store' })).json();
      const data = await (await fetch(`http://127.0.0.1:${config.api_port}/api/sync/execute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
      })).json();
      showToast(data.message, data.success ? 'success' : 'error');
    } catch { showToast('同步失败，请检查本地后台终端', 'error'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-6 rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-white/50 p-8">
    <h2 className="text-xl font-black">同步到本地 XHBlogs</h2>
    <p className="text-sm leading-7">先在编辑器发布并执行待处理队列，再将管理端源文件同步到同级博客目录。草稿保留在管理端；同名文件更新前保存恢复副本，目标独有文件会保留。</p>
    <p className="text-sm break-all font-mono">{blogPath || '正在读取固定目标目录…'}</p>
    <button onClick={() => void sync()} disabled={busy || !blogPath} className="rounded-2xl bg-indigo-500 px-6 py-3 text-white font-bold disabled:opacity-40">{busy ? '同步中…' : '同步 XHBlogs'}</button>
    <p className="text-sm text-slate-500">服务器部署由独立 ECS 流程完成。</p>
  </section>;
}
