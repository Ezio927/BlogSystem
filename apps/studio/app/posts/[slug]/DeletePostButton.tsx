"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type DeletePostButtonProps = {
  slug: string;
  title: string;
};

export function DeletePostButton({ slug, title }: DeletePostButtonProps) {
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `确定要删除文章「${title}」吗？\n\n此操作会删除本地 content/posts 中的文章文件，请确认已经提交或备份。`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.message ?? "删除文章失败。");
      }

      router.push("/posts");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除文章失败。");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="danger-zone">
      <div>
        <h2>危险操作</h2>
        <p>删除文章会移除本地文章文件。建议先确认 Git 状态或完成备份。</p>

        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
      </div>

      <button
        className="danger-button"
        type="button"
        disabled={isDeleting}
        onClick={handleDelete}
      >
        {isDeleting ? "删除中..." : "删除文章"}
      </button>
    </div>
  );
}