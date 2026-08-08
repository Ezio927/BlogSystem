import Link from "next/link";

export default function StudioNotFoundPage() {
  return (
    <div className="not-found">
      <p className="eyebrow">404</p>
      <h1>页面不存在</h1>
      <p>你访问的 Studio 页面不存在，或者该功能尚未实现。</p>
      <Link href="/">返回 Studio 首页</Link>
    </div>
  );
}