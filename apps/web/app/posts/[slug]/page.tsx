import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import {
  getAdjacentPosts,
  getAllPostSlugs,
  getPostBySlug
} from "../../../lib/posts";

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type MarkdownHeading = {
  id: string;
  level: 2 | 3;
  text: string;
  line: number;
};

type MarkdownNodePosition = {
  position?: {
    start?: {
      line?: number;
    };
  };
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({
    slug
  }));
}

export async function generateMetadata({
  params
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.summary
  };
}

function createHeadingId(text: string, line: number): string {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-_]+/gu, "");

  return normalized ? `${normalized}-${line}` : `heading-${line}`;
}

function stripMarkdownInlineSyntax(value: string): string {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#+$/g, "")
    .trim();
}

function extractMarkdownHeadings(content: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  let inCodeBlock = false;

  content.split("\n").forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("```") || trimmedLine.startsWith("~~~")) {
      inCodeBlock = !inCodeBlock;
      return;
    }

    if (inCodeBlock) {
      return;
    }

    const match = /^(#{2,3})\s+(.+)$/.exec(trimmedLine);

    if (!match) {
      return;
    }

    const level = match[1].length as 2 | 3;
    const text = stripMarkdownInlineSyntax(match[2]);

    if (!text) {
      return;
    }

    headings.push({
      id: createHeadingId(text, lineNumber),
      level,
      text,
      line: lineNumber
    });
  });

  return headings;
}

function getMarkdownNodeLine(node: unknown): number | undefined {
  const markdownNode = node as MarkdownNodePosition | undefined;

  return markdownNode?.position?.start?.line;
}

function getHeadingIdFromNode(
  node: unknown,
  headings: MarkdownHeading[]
): string | undefined {
  const line = getMarkdownNodeLine(node);

  if (line === undefined) {
    return undefined;
  }

  return headings.find((heading) => heading.line === line)?.id;
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const adjacentPosts = getAdjacentPosts(post.slug);
  const headings = extractMarkdownHeadings(post.content);

  const markdownComponents: Components = {
    h2({ node, children }) {
      return <h2 id={getHeadingIdFromNode(node, headings)}>{children}</h2>;
    },
    h3({ node, children }) {
      return <h3 id={getHeadingIdFromNode(node, headings)}>{children}</h3>;
    }
  };

  return (
    <main className="article-page">
      <article>
        <header className="article-header">
          <Link href="/posts" className="back-link">
            返回文章列表
          </Link>

          <p className="post-date">
            发布于 {post.publishedAt}
            {post.updatedAt !== post.publishedAt
              ? ` · 更新于 ${post.updatedAt}`
              : ""}
          </p>

          <h1>{post.title}</h1>
          <p className="intro">{post.summary}</p>

          {post.tags.length > 0 ? (
            <div className="tag-row" aria-label="文章标签">
              {post.tags.map((tag) => (
                <Link href={`/tags/${encodeURIComponent(tag)}`} key={tag}>
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}
        </header>

        <div className="article-content-layout">
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, rehypeHighlight]}
              components={markdownComponents}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {headings.length > 0 ? (
            <aside className="article-toc" aria-label="文章目录">
              <h2>目录</h2>
              <nav>
                <ol>
                  {headings.map((heading) => (
                    <li
                      className={
                        heading.level === 3
                          ? "toc-item toc-item-nested"
                          : "toc-item"
                      }
                      key={heading.id}
                    >
                      <a href={`#${heading.id}`}>{heading.text}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          ) : null}
        </div>
      </article>

      <nav className="post-navigation" aria-label="文章导航">
        {adjacentPosts.previous ? (
          <Link href={`/posts/${adjacentPosts.previous.slug}`}>
            <span>上一篇</span>
            <strong>{adjacentPosts.previous.title}</strong>
          </Link>
        ) : (
          <span />
        )}

        {adjacentPosts.next ? (
          <Link href={`/posts/${adjacentPosts.next.slug}`}>
            <span>下一篇</span>
            <strong>{adjacentPosts.next.title}</strong>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}