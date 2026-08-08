import type { Metadata } from "next";
import Link from "next/link";

import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";

import { ThemeToggle } from "../components/theme-toggle";
import { getSiteConfig } from "../lib/site";
import { ThemeScript } from "./theme-script";

import "./styles.css";

const site = getSiteConfig();
const currentYear = new Date().getFullYear();

export const metadata: Metadata = {
  title: {
    default: site.name,
    template: `%s | ${site.name}`
  },
  description: site.description,
  authors: [
    {
      name: site.author
    }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <header className="site-header">
          <Link href="/" className="site-logo">
            {site.name}
          </Link>

          <nav className="site-nav" aria-label="主导航">
            <Link href="/">首页</Link>
            <Link href="/posts">文章</Link>
            <Link href="/tags">标签</Link>
            <Link href="/archive">归档</Link>
            <Link href="/about">关于</Link>
            <ThemeToggle />
          </nav>
        </header>

        {children}

        <footer className="site-footer">
          <p>
            © {currentYear} {site.name}
          </p>
        </footer>
      </body>
    </html>
  );
}