import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-card">
        <p className="eyebrow">404</p>
        <h1>页面不存在</h1>
        <p>
          你访问的页面可能已经被移动、删除，或者链接地址输入有误。
        </p>

        <div className="not-found-actions">
          <Link href="/">返回首页</Link>
          <Link href="/posts">浏览文章</Link>
        </div>
      </section>
    </main>
  );
}