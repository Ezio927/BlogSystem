import Link from 'next/link';
import Navbar from '../components/Navbar';
export default function NotFound() {
 return <><Navbar/><main className="max-w-xl mx-auto mt-32 p-8 rounded-3xl bg-white/70 dark:bg-slate-800/70 text-center"><h1 className="text-3xl font-bold">404 · 没有找到这篇内容</h1><p className="my-5">内容可能尚未发布，或地址已经改变。</p><Link href="/" className="text-indigo-600 underline">回到首页</Link></main></>;
}
