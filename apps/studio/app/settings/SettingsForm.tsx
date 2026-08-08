"use client";

import { useEffect, useState } from "react";

type SiteSocialLink = {
  label: string;
  url: string;
};

type SiteConfig = {
  name: string;
  description: string;
  author: string;
  avatar?: string;
  socials: SiteSocialLink[];
};

type SiteConfigResponse = {
  ok: boolean;
  config?: SiteConfig;
  message?: string;
};

const emptyConfig: SiteConfig = {
  name: "",
  description: "",
  author: "",
  avatar: "",
  socials: [],
};

async function fetchSiteConfig(): Promise<SiteConfig> {
  const response = await fetch("/api/settings/site", {
    method: "GET",
    cache: "no-store",
  });

  const data = (await response.json()) as SiteConfigResponse;

  if (!response.ok || !data.config) {
    throw new Error(data.message ?? "读取站点配置失败。");
  }

  return data.config;
}

async function saveSiteConfig(config: SiteConfig): Promise<SiteConfig> {
  const response = await fetch("/api/settings/site", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });

  const data = (await response.json()) as SiteConfigResponse;

  if (!response.ok || !data.config) {
    throw new Error(data.message ?? "保存站点配置失败。");
  }

  return data.config;
}

export function SettingsForm() {
  const [config, setConfig] = useState<SiteConfig>(emptyConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadConfig() {
      try {
        const data = await fetchSiteConfig();

        if (!isCurrent) {
          return;
        }

        setConfig({
          ...data,
          avatar: data.avatar ?? "",
        });
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "读取站点配置失败。",
        );
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadConfig();

    return () => {
      isCurrent = false;
    };
  }, []);

  function updateField<Key extends keyof SiteConfig>(
    key: Key,
    value: SiteConfig[Key],
  ) {
    setConfig((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateSocial(
    index: number,
    key: keyof SiteSocialLink,
    value: string,
  ) {
    setConfig((current) => ({
      ...current,
      socials: current.socials.map((social, socialIndex) =>
        socialIndex === index
          ? {
              ...social,
              [key]: value,
            }
          : social,
      ),
    }));
  }

  function addSocial() {
    setConfig((current) => ({
      ...current,
      socials: [
        ...current.socials,
        {
          label: "",
          url: "",
        },
      ],
    }));
  }

  function removeSocial(index: number) {
    setConfig((current) => ({
      ...current,
      socials: current.socials.filter((_, socialIndex) => socialIndex !== index),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const savedConfig = await saveSiteConfig(config);

      setConfig({
        ...savedConfig,
        avatar: savedConfig.avatar ?? "",
      });
      setSuccessMessage("站点配置已保存。重新构建 Web 后，公开站点会使用新配置。");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "保存站点配置失败。",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="studio-card">
        <p>正在读取站点配置...</p>
      </section>
    );
  }

  return (
    <form className="page-stack" onSubmit={handleSubmit}>
      <section className="studio-card">
        <div className="section-heading-row">
          <div>
            <h2>基础资料</h2>
            <p>这些配置会写入 config/site.json，可以提交到 Git。</p>
          </div>

          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? "保存中..." : "保存配置"}
          </button>
        </div>

        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
        {successMessage ? <p className="success-message">{successMessage}</p> : null}

        <div className="form-grid">
          <label className="form-field">
            <span>博客名称</span>
            <input
              type="text"
              value={config.name}
              onChange={(event) => {
                updateField("name", event.target.value);
              }}
              placeholder="Open Blog"
              required
            />
          </label>

          <label className="form-field">
            <span>作者名称</span>
            <input
              type="text"
              value={config.author}
              onChange={(event) => {
                updateField("author", event.target.value);
              }}
              placeholder="Open Blog Author"
              required
            />
          </label>

          <label className="form-field form-field-full">
            <span>博客简介</span>
            <textarea
              value={config.description}
              onChange={(event) => {
                updateField("description", event.target.value);
              }}
              placeholder="记录技术学习、项目实践和日常思考。"
              rows={4}
              required
            />
          </label>

          <label className="form-field form-field-full">
            <span>头像地址</span>
            <input
              type="text"
              value={config.avatar ?? ""}
              onChange={(event) => {
                updateField("avatar", event.target.value);
              }}
              placeholder="/uploads/avatar.webp 或 https://example.com/avatar.webp"
            />
          </label>
        </div>
      </section>

      <section className="studio-card">
        <div className="section-heading-row">
          <div>
            <h2>社交链接</h2>
            <p>例如 GitHub、邮箱主页、知乎、掘金等公开链接。</p>
          </div>

          <button className="secondary-button" type="button" onClick={addSocial}>
            添加链接
          </button>
        </div>

        {config.socials.length === 0 ? (
          <p>暂无社交链接。</p>
        ) : (
          <div className="social-editor-list">
            {config.socials.map((social, index) => (
              <div className="social-editor-item" key={index}>
                <label className="form-field">
                  <span>名称</span>
                  <input
                    type="text"
                    value={social.label}
                    onChange={(event) => {
                      updateSocial(index, "label", event.target.value);
                    }}
                    placeholder="GitHub"
                  />
                </label>

                <label className="form-field">
                  <span>URL</span>
                  <input
                    type="url"
                    value={social.url}
                    onChange={(event) => {
                      updateSocial(index, "url", event.target.value);
                    }}
                    placeholder="https://github.com"
                  />
                </label>

                <button
                  className="danger-button"
                  type="button"
                  onClick={() => {
                    removeSocial(index);
                  }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="studio-card">
        <h2>当前配置预览</h2>

        <div className="settings-preview">
          {config.avatar ? (
            <img src={config.avatar} alt={`${config.author} 的头像`} />
          ) : null}

          <div>
            <h3>{config.name || "未填写博客名称"}</h3>
            <p>{config.description || "未填写博客简介"}</p>
            <p>作者：{config.author || "未填写作者名称"}</p>

            {config.socials.length > 0 ? (
              <ul>
                {config.socials.map((social, index) => (
                  <li key={`${social.label}-${index}`}>
                    {social.label || "未命名链接"}：{social.url || "未填写 URL"}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>
    </form>
  );
}