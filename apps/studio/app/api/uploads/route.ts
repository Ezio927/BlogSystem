import { randomUUID } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

const maxFileSize = 5 * 1024 * 1024;

const allowedImageTypes = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

type UploadedFileLike = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

async function pathExists(targetPath: string) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findWorkspaceRoot() {
  let current = process.cwd();

  while (true) {
    const contentPostsPath = path.join(current, "content", "posts");
    const webAppPath = path.join(current, "apps", "web");
    const studioAppPath = path.join(current, "apps", "studio");

    if (
      (await pathExists(contentPostsPath)) &&
      (await pathExists(webAppPath)) &&
      (await pathExists(studioAppPath))
    ) {
      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      throw new Error(
        "无法定位工作区根目录：未找到 content/posts、apps/web 和 apps/studio。",
      );
    }

    current = parent;
  }
}

function isUploadedFileLike(value: unknown): value is UploadedFileLike {
  if (!value || typeof value !== "object") {
    return false;
  }

  const file = value as Partial<UploadedFileLike>;

  return (
    typeof file.name === "string" &&
    typeof file.type === "string" &&
    typeof file.size === "number" &&
    typeof file.arrayBuffer === "function"
  );
}

function assertPathInsideDirectory(parentDirectory: string, targetPath: string) {
  const resolvedParentDirectory = path.resolve(parentDirectory);
  const resolvedTargetPath = path.resolve(targetPath);
  const relativePath = path.relative(
    resolvedParentDirectory,
    resolvedTargetPath,
  );

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("非法上传路径。");
  }
}

function getDateParts() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return {
    year,
    month,
  };
}

async function writeUploadFile(options: {
  publicRoot: string;
  year: string;
  month: string;
  fileName: string;
  buffer: Buffer;
}) {
  const uploadsRoot = path.resolve(options.publicRoot, "uploads");
  const uploadDirectory = path.resolve(uploadsRoot, options.year, options.month);
  const targetPath = path.resolve(uploadDirectory, options.fileName);

  assertPathInsideDirectory(uploadsRoot, uploadDirectory);
  assertPathInsideDirectory(uploadsRoot, targetPath);

  await mkdir(uploadDirectory, {
    recursive: true,
  });

  await writeFile(targetPath, options.buffer, {
    flag: "wx",
  });

  return targetPath;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!isUploadedFileLike(file)) {
      return NextResponse.json(
        {
          ok: false,
          message: "请上传图片文件。",
        },
        {
          status: 400,
        },
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "图片文件为空。",
        },
        {
          status: 400,
        },
      );
    }

    if (file.size > maxFileSize) {
      return NextResponse.json(
        {
          ok: false,
          message: "图片不能超过 5MB。",
        },
        {
          status: 400,
        },
      );
    }

    const extension = allowedImageTypes.get(file.type);

    if (!extension) {
      return NextResponse.json(
        {
          ok: false,
          message: "只支持 png、jpg、jpeg、webp、gif 图片。",
        },
        {
          status: 400,
        },
      );
    }

    const workspaceRoot = await findWorkspaceRoot();

    const { year, month } = getDateParts();
    const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const webPublicRoot = path.resolve(workspaceRoot, "apps", "web", "public");
    const studioPublicRoot = path.resolve(
      workspaceRoot,
      "apps",
      "studio",
      "public",
    );

    const webFilePath = await writeUploadFile({
      publicRoot: webPublicRoot,
      year,
      month,
      fileName,
      buffer,
    });

    const studioFilePath = await writeUploadFile({
      publicRoot: studioPublicRoot,
      year,
      month,
      fileName,
      buffer,
    });

    const url = `/uploads/${year}/${month}/${fileName}`;

    return NextResponse.json({
      ok: true,
      url,
      fileName,
      size: file.size,
      type: file.type,
      webFilePath,
      studioFilePath,
      message: "图片上传成功。",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "图片上传失败。",
      },
      {
        status: 500,
      },
    );
  }
}