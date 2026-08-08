import type { Metadata } from "next";
import Link from "next/link";
import "./styles.css";

export const metadata: Metadata = {
  title: "Open Blog Studio",
  description: "Local-first content studio for Open Blog"
};

const navItems = [
  {
    href: "/",
    label: "概览"
  },
  {
    href: "/posts",
    label: "文章"
  },
  {
    href: "/settings",
    label: "站点配置"
  },
  {
    href: "/publish",
    label: "发布"
  }
];

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="studio-shell">
          <aside className="studio-sidebar">
            <div className="studio-brand">
              <span className="studio-brand-mark">OB</span>
              <div>
                <strong>Open Blog</strong>
                <span>Local Studio</span>
              </div>
            </div>

            <nav className="studio-nav" aria-label="Studio navigation">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="studio-sidebar-note">
              <p>仅限本机访问</p>
              <code>127.0.0.1:3001</code>
            </div>
          </aside>

          <main className="studio-main">{children}</main>
        </div>
      </body>
    </html>
  );
}