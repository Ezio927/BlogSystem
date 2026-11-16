export default function ServerSettingsNotice() {
  return <section role="status" className="rounded-3xl border border-indigo-300/40 bg-white/70 p-8 text-sm leading-8 dark:bg-slate-900/70">
    <h2 className="text-xl font-bold">服务器写作模式</h2>
    <p>文章、杂谈、关于页可在编辑器直接发布，说说使用「立即发布」。草稿仅保存在服务器私有目录，发布后公网博客立即读取内容，无需同步。</p>
    <p>网站外观、友链、项目、相册和宠物配置由博客版本管理，修改后需要重新构建部署。此后台不提供这些配置的即时发布，也不使用本地同步或待处理队列。</p>
  </section>;
}
