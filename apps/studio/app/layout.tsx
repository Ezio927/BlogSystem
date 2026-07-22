import type { ReactNode } from "react";
import "./styles.css";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <aside>
          <strong>Open Blog Studio</strong>
          <nav>
            <a href="/">概览</a>
            <span aria-disabled="true">文章（待实现）</span>
            <span aria-disabled="true">设置（待实现）</span>
            <span aria-disabled="true">发布（待实现）</span>
          </nav>
        </aside>
        <main>{children}</main>
      </body>
    </html>
  );
}
