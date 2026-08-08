import fs from "node:fs";
import path from "node:path";

import { createContentService } from "@open-blog/content-core";

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
        `无法从 ${startDirectory} 向上找到工作区根目录，请确认 pnpm-workspace.yaml 存在`
      );
    }

    currentDirectory = parentDirectory;
  }
}

const workspaceRoot =
  process.env.OPEN_BLOG_ROOT && process.env.OPEN_BLOG_ROOT.trim() !== ""
    ? path.resolve(process.env.OPEN_BLOG_ROOT)
    : findWorkspaceRoot(process.cwd());

const postsRoot = path.join(workspaceRoot, "content", "posts");

try {
  const service = createContentService({
    postsRoot
  });

  service.validateContent();

  console.log("内容校验通过。");
} catch (error) {
  console.error("内容校验失败。");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
}