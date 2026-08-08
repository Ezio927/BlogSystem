import Link from "next/link";

import { ChecksPanel } from "./ChecksPanel";

export default function ChecksPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Publish</p>
          <h1>发布前校验</h1>
          <p>
            在 Git 提交、推送和部署之前，先检查本地文章内容是否满足 V1
            内容模型要求。
          </p>
        </div>

        <Link className="secondary-button" href="/posts">
          返回文章管理
        </Link>
      </header>

      <ChecksPanel />
    </div>
  );
}