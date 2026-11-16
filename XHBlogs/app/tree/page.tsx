import { listPublicFiles, readPublicMarkdown } from '../../lib/publicContent.mjs';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// 引入前台客户端组件
import CreativeWorkshopClient from './CreativeWorkshopClient';

export const dynamic = 'force-dynamic';

function getLocalItems(directoryName: string, typeName: string) {
  const dirPath = path.join((process.env.XHBLOGS_CONTENT_ROOT || process.cwd()), directoryName);
  let items: any[] = [];
  try {
    if (fs.existsSync(dirPath)) {
      if (fs.realpathSync(dirPath) !== path.resolve(dirPath)) return [];
      const publicCollection = directoryName === 'posts' || directoryName === 'chatters';
      const fileNames = publicCollection ? listPublicFiles(directoryName) : fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
      items = fileNames.map(fileName => {
        const fullPath = path.join(dirPath, fileName);
        // 🌟 核心：把 content（正文内容）和 data（头部参数）解构出来！
        if (fs.lstatSync(fullPath).isSymbolicLink()) return null;
        const source = publicCollection ? readPublicMarkdown(directoryName, fileName.slice(0, -3)) : fs.readFileSync(fullPath, 'utf8');
        if (source === null) return null;
        const { data, content } = matter(source);
        if (data.draft === true || data.draft === 'true') return null;

        // 提取真正的文件名作为路由 slug
        const realSlug = fileName.replace(/\.md$/, '');

        return {
          id: data.id || realSlug,
          slug: realSlug, // 🌟 强制保留真实的 slug 供路由跳转使用
          title: data.title || '',
          type: typeName,
          date: data.date || '2026-05-01',
          // 🌟 核心修复：把 cover（封面图）提取出来传给前台！如果写的是 image 也兼容
          cover: data.cover || data.image || null,
          // 把正文传给前台，去掉可能存在的换行符，限制长度防止卡片撑爆
          content: content.trim()
        };
      }).filter(Boolean);
    }
  } catch (error) {
    console.error(`读取 ${directoryName} 失败:`, error);
  }
  return items;
}

export default function CreativeWorkshopPage() {
  const posts = getLocalItems('posts', 'post');
  const chatters = getLocalItems('chatters', 'chatter');
  const moments = getLocalItems('moments', 'moment');

  return (
    <CreativeWorkshopClient
      posts={posts}
      chatters={chatters}
      moments={moments}
    />
  );
}