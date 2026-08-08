"use client";

import { useEffect, useMemo, useState } from "react";

type GitChangedFile = {
  path: string;
  status: string;
};

type PublishStatusResponse = {
  ok: boolean;
  branch: string;
  remote?: string;
  hasChanges: boolean;
  files: GitChangedFile[];
  message?: string;
};

type PublishStage = {
  name: string;
  ok: boolean;
  command?: string;
  output?: string;
  error?: string;
};

type PublishResponse = {
  ok: boolean;
  skipped?: boolean;
  message?: string;
  stages: PublishStage[];
};

async function fetchPublishStatus(): Promise<PublishStatusResponse> {
  const response = await fetch("/api/publish/status", {
    method: "GET",
    cache: "no-store",
  });

  const data = (await response.json()) as PublishStatusResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.message ?? "读取发布状态失败。");
  }

  return data;
}

async function publish(message: string): Promise<PublishResponse> {
  const response = await fetch("/api/publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
    }),
  });

  const data = (await response.json()) as PublishResponse;

  if (!response.ok || !data.ok) {
    const error = new Error(data.message ?? "发布失败。");

    Object.assign(error, {
      responseData: data,
    });

    throw error;
  }

  return data;
}

function getDefaultCommitMessage() {
  const now = new Date();
  const dateText = now.toISOString().slice(0, 10);

  return `content: update blog ${dateText}`;
}

function statusLabel(status: string) {
  const normalized = status.trim();

  if (normalized === "M") {
    return "修改";
  }

  if (normalized === "A") {
    return "新增";
  }

  if (normalized === "D") {
    return "删除";
  }

  if (normalized === "R") {
    return "重命名";
  }

  if (normalized === "??") {
    return "未跟踪";
  }

  return normalized || "变更";
}

export function PublishPanel() {
  const [status, setStatus] = useState<PublishStatusResponse | null>(null);
  const [message, setMessage] = useState(getDefaultCommitMessage);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [stages, setStages] = useState<PublishStage[]>([]);

  const canPublish = useMemo(() => {
    return Boolean(status?.hasChanges) && message.trim().length > 0 && !isPublishing;
  }, [status?.hasChanges, message, isPublishing]);

  async function refreshStatus() {
    setIsLoadingStatus(true);
    setErrorMessage(null);

    try {
      const data = await fetchPublishStatus();
      setStatus(data);
    } catch (error) {
      setStatus(null);
      setErrorMessage(
        error instanceof Error ? error.message : "读取发布状态失败。",
      );
    } finally {
      setIsLoadingStatus(false);
    }
  }

  async function handlePublish() {
    setIsPublishing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setStages([]);

    try {
      const result = await publish(message);

      setStages(result.stages);
      setSuccessMessage(result.message ?? "发布成功。");

      await refreshStatus();
    } catch (error) {
      const responseData = (error as Error & {
        responseData?: PublishResponse;
      }).responseData;

      if (responseData?.stages) {
        setStages(responseData.stages);
      }

      setErrorMessage(error instanceof Error ? error.message : "发布失败。");
    } finally {
      setIsPublishing(false);
    }
  }

  useEffect(() => {
    let isCancelled = false;

    fetchPublishStatus()
      .then((data) => {
        if (isCancelled) {
          return;
        }

        setStatus(data);
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        setStatus(null);
        setErrorMessage(
          error instanceof Error ? error.message : "读取发布状态失败。",
        );
      })
      .finally(() => {
        if (isCancelled) {
          return;
        }

        setIsLoadingStatus(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="page-stack">
      <section className="studio-card">
        <div className="section-heading-row">
          <div>
            <h2>发布状态</h2>
            <p>
              发布会执行 <code>pnpm check</code>，然后提交并推送{" "}
              <code>content/</code>、<code>config/</code> 和{" "}
              <code>apps/web/public/uploads/</code>。
            </p>
          </div>

          <button
            className="secondary-button"
            type="button"
            disabled={isLoadingStatus || isPublishing}
            onClick={() => {
              void refreshStatus();
            }}
          >
            {isLoadingStatus ? "刷新中..." : "刷新状态"}
          </button>
        </div>

        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
        {successMessage ? <p className="success-message">{successMessage}</p> : null}

        {isLoadingStatus ? <p>正在读取 Git 状态...</p> : null}

        {status ? (
          <div className="publish-meta-grid">
            <div className="checks-summary-card">
              <span>当前分支</span>
              <strong>{status.branch || "-"}</strong>
            </div>

            <div className="checks-summary-card">
              <span>远程仓库</span>
              <strong>{status.remote ? "已配置" : "未配置"}</strong>
            </div>

            <div
              className={
                status.hasChanges
                  ? "checks-summary-card warning"
                  : "checks-summary-card success"
              }
            >
              <span>工作区状态</span>
              <strong>{status.hasChanges ? "有变更" : "干净"}</strong>
            </div>

            <div className="checks-summary-card">
              <span>变更文件</span>
              <strong>{status.files.length}</strong>
            </div>
          </div>
        ) : null}

        {status?.remote ? (
          <p className="muted-text">
            远程仓库：<code>{status.remote}</code>
          </p>
        ) : null}

        {status && !status.hasChanges ? (
          <div className="publish-readiness ready">
            <strong>无需发布</strong>
            <p>当前没有未提交变更。</p>
          </div>
        ) : null}

        {status?.hasChanges ? (
          <div className="publish-readiness blocked">
            <strong>发现未提交变更</strong>
            <p>请确认变更内容无误，然后输入提交信息并发布。</p>
          </div>
        ) : null}
      </section>

      {status?.hasChanges ? (
        <section className="studio-card">
          <h2>变更文件</h2>

          <div className="changed-files-list">
            {status.files.map((file) => (
              <div className="changed-file-item" key={`${file.status}-${file.path}`}>
                <span>{statusLabel(file.status)}</span>
                <code>{file.path}</code>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="studio-card">
        <h2>发布操作</h2>

        <label className="form-field">
          <span>提交信息</span>
          <input
            type="text"
            value={message}
            disabled={isPublishing}
            maxLength={120}
            onChange={(event) => {
              setMessage(event.target.value);
            }}
            placeholder="content: update blog"
          />
        </label>

        <div className="publish-actions">
          <button
            className="primary-button"
            type="button"
            disabled={!canPublish}
            onClick={() => {
              void handlePublish();
            }}
          >
            {isPublishing ? "发布中..." : "运行检查并发布"}
          </button>

          <p>
            Git push 失败时，系统不会删除或覆盖本地内容。请根据错误信息检查网络、权限或远程分支配置。
          </p>
        </div>
      </section>

      {stages.length > 0 ? (
        <section className="studio-card">
          <h2>发布日志</h2>

          <div className="publish-stage-list">
            {stages.map((stage, index) => (
              <article
                className={`publish-stage-item ${
                  stage.ok ? "publish-stage-ok" : "publish-stage-error"
                }`}
                key={`${stage.name}-${index}`}
              >
                <div className="check-item-header">
                  <span className={`check-severity ${stage.ok ? "success" : "error"}`}>
                    {stage.ok ? "通过" : "失败"}
                  </span>

                  <strong>{stage.name}</strong>

                  {stage.command ? <code>{stage.command}</code> : null}
                </div>

                {stage.output ? <pre>{stage.output}</pre> : null}
                {stage.error ? <pre>{stage.error}</pre> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}