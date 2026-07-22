import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteConfig } from "../../../config/site.config";
import "./styles.css";

export const metadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.title}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={siteConfig.language}>
      <body>
        <header className="site-header">
          <a href="/" className="brand">{siteConfig.title}</a>
          <nav aria-label="主导航">
            <a href="/">文章</a>
            <a href="/about">关于</a>
          </nav>
        </header>
        <main className="shell">{children}</main>
        <footer className="site-footer">Built with Open Blog</footer>
      </body>
    </html>
  );
}
