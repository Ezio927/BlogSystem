"use client";
import { ImageUploader } from "../../../components/ImageUploader";
import { evaluate } from "@mdx-js/mdx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ComponentType,
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import * as runtime from "react/jsx-runtime";

type EditPostFormProps = {
  slug: string;
  initialValues: {
    title: string;
    summary: string;
    publishedAt: string;
    updatedAt: string;
    cover: string;
    tags: string[];
    draft: boolean;
    content: string;
  };
};

type MdxComponentProps = {
  children?: ReactNode;
  href?: unknown;
  title?: unknown;
  [key: string]: unknown;
};

type MdxPreviewProps = {
  content: string;
};

const mdxComponents = {
  a(props: MdxComponentProps) {
    return (
      <a
        href={typeof props.href === "string" ? props.href : undefined}
        target="_blank"
        rel="noreferrer"
      >
        {props.children}
      </a>
    );
  },

  MyComponent(props: MdxComponentProps) {
    return (
      <div className="mdx-demo-component">
        <strong>MDX 组件预览：MyComponent</strong>

        {typeof props.title === "string" ? <p>{props.title}</p> : null}

        <details>
          <summary>组件 props</summary>
          <pre>{JSON.stringify(props, null, 2)}</pre>
        </details>
      </div>
    );
  },
};

type PreviewState =
  | {
      status: "idle";
      content: string;
    }
  | {
      status: "compiling";
      content: string;
    }
  | {
      status: "ready";
      content: string;
      Component: ComponentType;
    }
  | {
      status: "error";
      content: string;
      message: string;
    };

function MdxLivePreview({ content }: MdxPreviewProps) {
  const [previewState, setPreviewState] = useState<PreviewState>({
    status: "idle",
    content: "",
  });

  useEffect(() => {
    let cancelled = false;

    if (!content.trim()) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPreviewState({
        status: "compiling",
        content,
      });

      void evaluate(content, {
        ...runtime,
        useMDXComponents: () => mdxComponents,
      })
        .then((result) => {
          if (cancelled) {
            return;
          }

          setPreviewState({
            status: "ready",
            content,
            Component: result.default as ComponentType,
          });
        })
        .catch((error: unknown) => {
          if (cancelled) {
            return;
          }

          setPreviewState({
            status: "error",
            content,
            message:
              error instanceof Error ? error.message : "MDX 预览编译失败。",
          });
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [content]);

  if (!content.trim()) {
    return <div className="preview-empty">这里会显示 Markdown / MDX 预览。</div>;
  }

  if (previewState.content !== content) {
    return <div className="preview-empty">正在生成预览...</div>;
  }

  if (previewState.status === "compiling") {
    return <div className="preview-empty">正在生成预览...</div>;
  }

  if (previewState.status === "error") {
    return (
      <div className="preview-error">
        <strong>MDX 预览失败</strong>
        <p>{previewState.message}</p>
        <small>
          如果文章中使用了自定义 MDX 组件，需要先在编辑器预览组件表中注册。
        </small>
      </div>
    );
  }

  if (previewState.status !== "ready") {
    return <div className="preview-empty">正在生成预览...</div>;
  }

  const PreviewComponent = previewState.Component;

  return (
    <div className="markdown-preview-content">
      <PreviewComponent />
    </div>
  );
}

export function EditPostForm({ slug, initialValues }: EditPostFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [cover, setCover] = useState(initialValues.cover);
  const [content, setContent] = useState(initialValues.content);
  const [draft, setDraft] = useState(initialValues.draft);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const detailHref = `/posts/${encodeURIComponent(slug)}`;
  function insertImageToContent(url: string) {
    setContent((currentContent) => {
      const imageMarkdown = `![图片描述](${url})`;

      if (!currentContent.trim()) {
        return `${imageMarkdown}\n`;
      }

      return `${currentContent.trimEnd()}\n\n${imageMarkdown}\n`;
    });
  }
  async function savePost(options?: { draft?: boolean }) {
    if (!formRef.current) {
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setErrorMessage(null);

    const formData = new FormData(formRef.current);
    const nextDraft =
      typeof options?.draft === "boolean" ? options.draft : draft;

    const payload = {
      title: String(formData.get("title") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      publishedAt: String(formData.get("publishedAt") ?? ""),
      updatedAt: String(formData.get("updatedAt") ?? ""),
      cover,
      tags: String(formData.get("tags") ?? ""),
      draft: nextDraft,
      content,
    };

    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(slug)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.message ?? "保存失败。");
      }

      setMessage("保存成功，正在返回详情页...");

      router.push(detailHref);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await savePost();
  }

  async function handlePublish() {
    setDraft(false);
    await savePost({ draft: false });
  }

  async function handleConvertToDraft() {
    setDraft(true);
    await savePost({ draft: true });
  }

  return (
    <form ref={formRef} className="editor-form" onSubmit={handleSubmit}>
      <section className="studio-card editor-section">
        <h2>基础信息</h2>

        <div className="form-grid">
          <label className="form-field">
            <span>标题</span>
            <input
              name="title"
              type="text"
              defaultValue={initialValues.title}
              required
            />
          </label>

          <label className="form-field">
            <span>Slug</span>
            <input name="slug" type="text" defaultValue={slug} readOnly />
            <small>当前版本暂不支持修改 slug。</small>
          </label>

          <label className="form-field form-field-full">
            <span>摘要</span>
            <textarea
              name="summary"
              rows={3}
              defaultValue={initialValues.summary}
            />
          </label>

          <label className="form-field">
            <span>发布时间</span>
            <input
              name="publishedAt"
              type="text"
              defaultValue={initialValues.publishedAt}
              placeholder="例如：2025-01-01"
            />
          </label>

          <label className="form-field">
            <span>更新时间</span>
            <input
              name="updatedAt"
              type="text"
              defaultValue={initialValues.updatedAt}
              placeholder="例如：2025-01-02"
            />
          </label>

          <label className="form-field form-field-full">
            <span>封面图</span>
            <input
              name="cover"
              type="text"
              value={cover}
              onChange={(event) => setCover(event.target.value)}
              placeholder="例如：/uploads/example.webp"
            />
          </label>

          <label className="form-field form-field-full">
            <span>标签</span>
            <input
              name="tags"
              type="text"
              defaultValue={initialValues.tags.join(", ")}
              placeholder="例如：Next.js, TypeScript, Markdown"
            />
            <small>多个标签用英文逗号分隔。</small>
          </label>

          <label className="checkbox-field">
            <input
              name="draft"
              type="checkbox"
              checked={draft}
              onChange={(event) => setDraft(event.target.checked)}
            />
            <span>草稿状态</span>
          </label>
        </div>
      </section>
      <ImageUploader
        onInsertToContent={insertImageToContent}
        onSetCover={setCover}
      />
      <section className="studio-card editor-section">
        <div className="section-heading-row">
          <div>
            <h2>正文 Markdown / MDX</h2>
            <p>左侧编辑，右侧实时渲染。支持基础 Markdown 和可注册的 MDX 组件。</p>
          </div>

          <div className={draft ? "status-badge draft" : "status-badge published"}>
            {draft ? "草稿" : "已发布"}
          </div>
        </div>

        <div className="editor-preview-grid">
          <label className="form-field editor-pane">
            <span>正文内容</span>
            <textarea
              className="markdown-editor"
              name="content"
              rows={28}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              spellCheck={false}
            />
          </label>

          <aside className="preview-pane">
            <div className="preview-pane-header">
              <span>实时 MDX 预览</span>
            </div>

            <MdxLivePreview content={content} />
          </aside>
        </div>
      </section>

      <section className="studio-card">
        <h2>保存修改</h2>
        <p>点击保存后，会直接写回本地 Markdown 或 MDX 文件。</p>

        {message ? <p className="success-message">{message}</p> : null}
        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

        <div className="form-actions">
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? "保存中..." : "保存文章"}
          </button>

          {draft ? (
            <button
              className="success-button"
              type="button"
              disabled={isSaving}
              onClick={handlePublish}
            >
              {isSaving ? "处理中..." : "发布并保存"}
            </button>
          ) : (
            <button
              className="warning-button"
              type="button"
              disabled={isSaving}
              onClick={handleConvertToDraft}
            >
              {isSaving ? "处理中..." : "转为草稿并保存"}
            </button>
          )}

          <Link className="secondary-button" href={detailHref}>
            取消
          </Link>
        </div>
      </section>
    </form>
  );
}