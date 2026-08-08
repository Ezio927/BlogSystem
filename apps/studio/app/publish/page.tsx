import { PublishPanel } from "./PublishPanel";

export default function StudioPublishPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Publish</p>
          <h1>发布博客</h1>
          <p>
            运行发布前检查，将内容、公开配置和 Web 图片提交到 Git 仓库，并推送到远程触发 CI/CD。
          </p>
        </div>
      </header>

      <PublishPanel />
    </div>
  );
}