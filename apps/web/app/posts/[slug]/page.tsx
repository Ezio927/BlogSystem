import path from "node:path";
import { notFound } from "next/navigation";
import { listPosts } from "@open-blog/content-core";
import { MarkdownRenderer } from "@open-blog/markdown-renderer";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

async function getPosts() {
  return listPosts(path.resolve(process.cwd(), "../../content/posts"));
}

export async function generateStaticParams() {
  return (await getPosts()).map(({ metadata }) => ({ slug: metadata.slug }));
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = (await getPosts()).find((item) => item.metadata.slug === slug);
  if (!post) notFound();

  return (
    <article className="prose">
      <header>
        <time dateTime={post.metadata.publishedAt}>{post.metadata.publishedAt}</time>
        <h1>{post.metadata.title}</h1>
        <p>{post.metadata.summary}</p>
      </header>
      <MarkdownRenderer source={post.content} />
    </article>
  );
}
