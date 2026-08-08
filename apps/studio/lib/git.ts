import fs from "node:fs/promises";
import path from "node:path";

import { runCommand, type CommandResult } from "./command";
import { assertPathInsideDirectory, workspaceRoot } from "./paths";

export type GitChangedFile = {
  path: string;
  status: string;
};

export type GitStatus = {
  branch: string;
  remote?: string;
  hasChanges: boolean;
  files: GitChangedFile[];
};

export type PublishStage = {
  name: string;
  ok: boolean;
  command?: string;
  output?: string;
  error?: string;
};

function normalizePathForCompare(value: string): string {
  const resolved = path.resolve(value);

  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function commandToText(result: CommandResult): string {
  const commandLine = [result.command, ...result.args].join(" ");

  const parts = [`$ ${commandLine}`];

  if (result.stdout.trim()) {
    parts.push(result.stdout.trim());
  }

  if (result.stderr.trim()) {
    parts.push(result.stderr.trim());
  }

  if (result.timedOut) {
    parts.push("命令执行超时。");
  }

  if (result.exitCode !== 0) {
    parts.push(`退出码：${result.exitCode}`);
  }

  return parts.join("\n\n");
}

export function resultToStage(
  name: string,
  result: CommandResult,
  options?: {
    allowExitCodes?: number[];
  },
): PublishStage {
  const allowExitCodes = options?.allowExitCodes ?? [0];
  const ok = result.exitCode !== null && allowExitCodes.includes(result.exitCode);

  return {
    name,
    ok,
    command: [result.command, ...result.args].join(" "),
    output: ok ? commandToText(result) : undefined,
    error: ok ? undefined : commandToText(result),
  };
}

export async function ensureGitRepositoryInsideWorkspace(): Promise<void> {
  const result = await runCommand("git", ["rev-parse", "--show-toplevel"], {
    cwd: workspaceRoot,
    timeoutMs: 15_000,
  });

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr.trim() ||
        result.stdout.trim() ||
        "当前工作区不是 Git 仓库，无法发布。",
    );
  }

  const gitRoot = result.stdout.trim();

  const normalizedGitRoot = normalizePathForCompare(gitRoot);
  const normalizedWorkspaceRoot = normalizePathForCompare(workspaceRoot);

  if (normalizedGitRoot !== normalizedWorkspaceRoot) {
    assertPathInsideDirectory(workspaceRoot, gitRoot);
  }
}

function parsePorcelainStatus(output: string): GitChangedFile[] {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const status = line.slice(0, 2).trim() || line.slice(0, 2);
      let filePath = line.slice(3).trim();

      if (filePath.includes(" -> ")) {
        filePath = filePath.split(" -> ").at(-1)?.trim() ?? filePath;
      }

      return {
        status,
        path: filePath,
      };
    });
}

export async function getGitStatus(): Promise<GitStatus> {
  await ensureGitRepositoryInsideWorkspace();

  const branchResult = await runCommand("git", ["branch", "--show-current"], {
    cwd: workspaceRoot,
    timeoutMs: 15_000,
  });

  if (branchResult.exitCode !== 0) {
    throw new Error(
      branchResult.stderr.trim() ||
        branchResult.stdout.trim() ||
        "读取当前 Git 分支失败。",
    );
  }

  const statusResult = await runCommand(
    "git",
    ["status", "--porcelain=v1", "-uall"],
    {
      cwd: workspaceRoot,
      timeoutMs: 15_000,
    },
  );

  if (statusResult.exitCode !== 0) {
    throw new Error(
      statusResult.stderr.trim() ||
        statusResult.stdout.trim() ||
        "读取 Git 状态失败。",
    );
  }

  const remoteResult = await runCommand("git", ["remote", "get-url", "origin"], {
    cwd: workspaceRoot,
    timeoutMs: 15_000,
  });

  const files = parsePorcelainStatus(statusResult.stdout);

  return {
    branch: branchResult.stdout.trim() || "(detached)",
    remote:
      remoteResult.exitCode === 0 && remoteResult.stdout.trim()
        ? remoteResult.stdout.trim()
        : undefined,
    hasChanges: files.length > 0,
    files,
  };
}

async function pathExists(relativePath: string): Promise<boolean> {
  try {
    await fs.stat(path.join(workspaceRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function getPublishPathspecs(): Promise<string[]> {
  const candidates = [
    "content",
    "config",
    path.join("apps", "web", "public", "uploads"),
  ];

  const existing: string[] = [];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      existing.push(candidate.replaceAll("\\", "/"));
    }
  }

  return existing;
}

export { commandToText };