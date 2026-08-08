"use client";

import { useRef, useState } from "react";

type UploadResponse = {
  ok?: boolean;
  url?: string;
  fileName?: string;
  message?: string;
};

type ImageUploaderProps = {
  onInsertToContent: (url: string) => void;
  onSetCover: (url: string) => void;
};

const allowedTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const maxFileSize = 5 * 1024 * 1024;

export function ImageUploader({
  onInsertToContent,
  onSetCover,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleFileChange(file: File | null) {
    setSelectedFile(file);
    setUploadedUrl(null);
    setMessage(null);
    setErrorMessage(null);

    if (!file) {
      return;
    }

    if (!allowedTypes.has(file.type)) {
      setSelectedFile(null);
      setErrorMessage("只支持 png、jpg、jpeg、webp、gif 图片。");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    if (file.size > maxFileSize) {
      setSelectedFile(null);
      setErrorMessage("图片不能超过 5MB。");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function uploadImage() {
    if (!selectedFile) {
      setErrorMessage("请先选择图片。");
      return;
    }

    setIsUploading(true);
    setMessage(null);
    setErrorMessage(null);

    const formData = new FormData();
    formData.set("file", selectedFile);

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as UploadResponse;

      if (!response.ok || !result.url) {
        throw new Error(result.message ?? "图片上传失败。");
      }

      setUploadedUrl(result.url);
      setMessage("图片上传成功。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "图片上传失败。");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="studio-card editor-section">
      <div className="section-heading-row">
        <div>
          <h2>本地图片导入</h2>
          <p>上传后会复制到 apps/web/public/uploads，并生成可用于文章的 URL。</p>
        </div>
      </div>

      <div className="image-uploader">
        <label className="form-field">
          <span>选择图片</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={isUploading}
            onChange={(event) => {
              handleFileChange(event.target.files?.[0] ?? null);
            }}
          />
          <small>支持 png、jpg、jpeg、webp、gif，最大 5MB。</small>
        </label>

        {selectedFile ? (
          <div className="upload-file-info">
            <strong>{selectedFile.name}</strong>
            <span>{Math.ceil(selectedFile.size / 1024)} KB</span>
          </div>
        ) : null}

        {message ? <p className="success-message">{message}</p> : null}
        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

        <div className="form-actions">
          <button
            className="primary-button"
            type="button"
            disabled={isUploading || !selectedFile}
            onClick={() => {
              void uploadImage();
            }}
          >
            {isUploading ? "上传中..." : "上传图片"}
          </button>

          {uploadedUrl ? (
            <>
              <button
                className="secondary-button"
                type="button"
                onClick={() => onInsertToContent(uploadedUrl)}
              >
                插入正文
              </button>

              <button
                className="secondary-button"
                type="button"
                onClick={() => onSetCover(uploadedUrl)}
              >
                设为封面
              </button>
            </>
          ) : null}
        </div>

        {uploadedUrl ? (
          <div className="uploaded-image-result">
            <span>图片 URL</span>
            <code>{uploadedUrl}</code>

            <div className="uploaded-image-preview">
              <img src={uploadedUrl} alt="上传图片预览" />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}