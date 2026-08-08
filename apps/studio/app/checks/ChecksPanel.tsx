"use client";

import { useEffect, useState } from "react";

type CheckSeverity = "success" | "warning" | "error";

type CheckItem = {
  severity: CheckSeverity;
  scope: string;
  message: string;
  file?: string;
};

type ChecksResponse = {
  ok: boolean;
  summary: {
    errors: number;
    warnings: number;
    successes: number;
    total: number;
    posts?: number;
  };
  checks: CheckItem[];
};

function getSeverityLabel(severity: CheckSeverity) {
  switch (severity) {
    case "success":
      return "通过";
    case "warning":
      return "警告";
    case "error":
      return "错误";
    default:
      return severity satisfies never;
  }
}

async function fetchChecks() {
  const response = await fetch("/api/checks", {
    method: "GET",
    cache: "no-store",
  });

  const data = (await response.json()) as ChecksResponse;

  if (!response.ok) {
    throw new Error(data.checks?.[0]?.message ?? "发布前校验接口请求失败。");
  }

  return data;
}

export function ChecksPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<ChecksResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function runChecks() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchChecks();

      setResult(data);
    } catch (error) {
      setResult(null);
      setErrorMessage(
        error instanceof Error ? error.message : "发布前校验失败。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isCurrent = true;

    async function runInitialChecks() {
      try {
        const data = await fetchChecks();

        if (!isCurrent) {
          return;
        }

        setResult(data);
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        setResult(null);
        setErrorMessage(
          error instanceof Error ? error.message : "发布前校验失败。",
        );
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void runInitialChecks();

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <>
      <section className="studio-card">
        <div className="section-heading-row">
          <div>
            <h2>校验结果</h2>
            <p>当前阶段只做内容和 MDX 编译校验，后续会接入 build 与 Git 状态。</p>
          </div>

          <button
            className="primary-button"
            type="button"
            disabled={isLoading}
            onClick={() => {
              void runChecks();
            }}
          >
            {isLoading ? "校验中..." : "重新校验"}
          </button>
        </div>

        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

        {isLoading ? <p>正在校验 content/posts...</p> : null}

        {result ? (
          <div className="checks-summary-grid">
            <div className="checks-summary-card">
              <span>文章数</span>
              <strong>{result.summary.posts ?? 0}</strong>
            </div>

            <div className="checks-summary-card success">
              <span>通过</span>
              <strong>{result.summary.successes}</strong>
            </div>

            <div className="checks-summary-card warning">
              <span>警告</span>
              <strong>{result.summary.warnings}</strong>
            </div>

            <div className="checks-summary-card error">
              <span>错误</span>
              <strong>{result.summary.errors}</strong>
            </div>
          </div>
        ) : null}

        {result ? (
          <div
            className={
              result.ok ? "publish-readiness ready" : "publish-readiness blocked"
            }
          >
            <strong>{result.ok ? "可以进入发布流程" : "暂不建议发布"}</strong>
            <p>
              {result.ok
                ? "当前没有发现阻塞发布的问题。"
                : "请先修复错误项，再进行 Git 提交、推送和部署。"}
            </p>
          </div>
        ) : null}
      </section>

      {result ? (
        <section className="studio-card">
          <h2>详细检查项</h2>

          {result.checks.length > 0 ? (
            <div className="checks-list">
              {result.checks.map((check, index) => (
                <article
                  className={`check-item check-item-${check.severity}`}
                  key={`${check.scope}-${check.file ?? "global"}-${index}`}
                >
                  <div className="check-item-header">
                    <span className={`check-severity ${check.severity}`}>
                      {getSeverityLabel(check.severity)}
                    </span>

                    <strong>{check.scope}</strong>

                    {check.file ? <code>{check.file}</code> : null}
                  </div>

                  <p>{check.message}</p>
                </article>
              ))}
            </div>
          ) : (
            <p>暂无检查项。</p>
          )}
        </section>
      ) : null}

      <section className="studio-card">
        <h2>当前校验范围</h2>
        <ul className="feature-list">
          <li>文章 frontmatter 必填字段</li>
          <li>slug 格式和重复检查</li>
          <li>日期格式检查</li>
          <li>tags 和 draft 类型检查</li>
          <li>Markdown / MDX 编译检查</li>
          <li>文件路径安全检查</li>
        </ul>
      </section>
    </>
  );
}