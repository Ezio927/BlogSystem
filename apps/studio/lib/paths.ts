import fs from "node:fs";
import path from "node:path";

function findWorkspaceRoot(startDirectory: string): string {
  let currentDirectory = startDirectory;

  while (true) {
    const workspaceFile = path.join(currentDirectory, "pnpm-workspace.yaml");
    const packageFile = path.join(currentDirectory, "package.json");

    if (fs.existsSync(workspaceFile) && fs.existsSync(packageFile)) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      throw new Error(
        `无法从 ${startDirectory} 向上找到工作区根目录，请确认 pnpm-workspace.yaml 存在`,
      );
    }

    currentDirectory = parentDirectory;
  }
}

export const workspaceRoot =
  process.env.OPEN_BLOG_ROOT && process.env.OPEN_BLOG_ROOT.trim() !== ""
    ? path.resolve(process.env.OPEN_BLOG_ROOT)
    : findWorkspaceRoot(process.cwd());

export const contentRoot = path.join(workspaceRoot, "content");

export const configRoot = path.join(workspaceRoot, "config");

export const postsRoot = path.join(contentRoot, "posts");

export const webPublicRoot = path.join(workspaceRoot, "apps", "web", "public");

export const studioPublicRoot = path.join(
  workspaceRoot,
  "apps",
  "studio",
  "public",
);

export function assertPathInsideDirectory(
  parentDirectory: string,
  targetPath: string,
) {
  const resolvedParentDirectory = path.resolve(parentDirectory);
  const resolvedTargetPath = path.resolve(targetPath);

  const relativePath = path.relative(
    resolvedParentDirectory,
    resolvedTargetPath,
  );

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("目标路径不在允许的目录内。");
  }
}