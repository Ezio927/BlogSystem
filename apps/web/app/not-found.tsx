import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero">
      <p className="eyebrow">404</p>
      <h1>页面不存在</h1>
      <p><Link href="/">返回首页</Link></p>
    </section>
  );
}
