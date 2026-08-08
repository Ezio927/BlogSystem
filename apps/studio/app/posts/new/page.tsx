import Link from "next/link";

import { NewPostForm } from "./NewPostForm";

function getTodayText() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewPostPage() {
  const today = getTodayText();

  return (
    <main className="studio-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Posts</p>
          <h1>新建文章</h1>
          <p className="page-description">
            创建一篇新的 Markdown / MDX 文章，文件会写入 content/posts。
          </p>
        </div>

        <Link className="secondary-button" href="/posts">
          返回文章列表
        </Link>
      </div>

      <NewPostForm
        initialValues={{
          title: "",
          slug: "",
          summary: "",
          publishedAt: today,
          updatedAt: today,
          cover: "",
          tags: [],
          draft: true,
          content: "# 新文章\n\n开始写作吧。",
        }}
      />
    </main>
  );
}