import { NextResponse, type NextRequest } from "next/server";

import { runCommand } from "../../../lib/command";
import {
  getGitStatus,
  getPublishPathspecs,
  resultToStage,
  type PublishStage,
} from "../../../lib/git";
import { workspaceRoot } from "../../../lib/paths";

export const runtime = "nodejs";

type PublishRequest = {
  message?: unknown;
};

function normalizeCommitMessage(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("提交信息必须是字符串。");
  }

  const message = value.trim();

  if (message.length === 0) {
    throw new Error("提交信息不能为空。");
  }

  if (message.length > 120) {
    throw new Error("提交信息不能超过 120 个字符。");
  }

  if (message.includes("\n") || message.includes("\r")) {
    throw new Error("提交信息不能包含换行。");
  }

  return message;
}

function latestFailedStageMessage(stages: PublishStage[]): string {
  const failedStage = stages.find((stage) => !stage.ok);

  return failedStage?.error ?? failedStage?.name ?? "发布失败。";
}

export async function POST(request: NextRequest) {
  const stages: PublishStage[] = [];

  try {
    const body = (await request.json()) as PublishRequest;
    const message = normalizeCommitMessage(body.message);

    const initialStatus = await getGitStatus();

    stages.push({
      name: "读取 Git 状态",
      ok: true,
      output: initialStatus.hasChanges
        ? `当前分支：${initialStatus.branch}\n发现 ${initialStatus.files.length} 个变更文件。`
        : `当前分支：${initialStatus.branch}\n没有需要发布的变更。`,
    });

    if (!initialStatus.hasChanges) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "当前没有未提交变更，无需发布。",
        stages,
      });
    }

    const checkResult = await runCommand("pnpm", ["check"], {
      cwd: workspaceRoot,
      timeoutMs: 10 * 60_000,
      maxOutputLength: 120_000,
    });

    const checkStage = resultToStage("发布前检查：pnpm check", checkResult);
    stages.push(checkStage);

    if (!checkStage.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "发布前检查未通过，请修复后重试。",
          stages,
        },
        {
          status: 400,
        },
      );
    }

    const pathspecs = await getPublishPathspecs();

    if (pathspecs.length === 0) {
      stages.push({
        name: "准备提交路径",
        ok: false,
        error: "未找到可发布路径。至少需要 content、config 或 apps/web/public/uploads。",
      });

      return NextResponse.json(
        {
          ok: false,
          message: latestFailedStageMessage(stages),
          stages,
        },
        {
          status: 400,
        },
      );
    }

    const addResult = await runCommand("git", ["add", "--", ...pathspecs], {
      cwd: workspaceRoot,
      timeoutMs: 60_000,
      maxOutputLength: 80_000,
    });

    const addStage = resultToStage("暂存发布内容", addResult);
    stages.push(addStage);

    if (!addStage.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "暂存发布内容失败。",
          stages,
        },
        {
          status: 400,
        },
      );
    }

    const diffCachedResult = await runCommand(
      "git",
      ["diff", "--cached", "--quiet"],
      {
        cwd: workspaceRoot,
        timeoutMs: 30_000,
      },
    );

    /**
     * git diff --cached --quiet:
     * - 0：没有 staged diff
     * - 1：存在 staged diff
     * - 其他：命令错误
     */
    if (diffCachedResult.exitCode === 0) {
      stages.push({
        name: "检查暂存变更",
        ok: true,
        output:
          "没有可提交的暂存变更。可能变更文件不在发布范围内，或已被 .gitignore 忽略。",
      });

      return NextResponse.json({
        ok: true,
        skipped: true,
        message: "没有可提交的变更。",
        stages,
      });
    }

    if (diffCachedResult.exitCode !== 1) {
      const diffStage = resultToStage("检查暂存变更", diffCachedResult, {
        allowExitCodes: [0, 1],
      });
      stages.push(diffStage);

      return NextResponse.json(
        {
          ok: false,
          message: "检查暂存变更失败。",
          stages,
        },
        {
          status: 400,
        },
      );
    }

    stages.push({
      name: "检查暂存变更",
      ok: true,
      output: "已发现可提交的暂存变更。",
    });

    const commitResult = await runCommand("git", ["commit", "-m", message], {
      cwd: workspaceRoot,
      timeoutMs: 60_000,
      maxOutputLength: 100_000,
    });

    const commitStage = resultToStage("创建 Git 提交", commitResult);
    stages.push(commitStage);

    if (!commitStage.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "创建 Git 提交失败。",
          stages,
        },
        {
          status: 400,
        },
      );
    }

    const pushResult = await runCommand("git", ["push"], {
      cwd: workspaceRoot,
      timeoutMs: 5 * 60_000,
      maxOutputLength: 120_000,
    });

    const pushStage = resultToStage("推送到远程仓库", pushResult);
    stages.push(pushStage);

    if (!pushStage.ok) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Git push 失败。本地内容和刚创建的提交不会被删除或覆盖，请检查远程仓库、网络、权限或上游分支配置。",
          stages,
        },
        {
          status: 400,
        },
      );
    }

    const finalStatus = await getGitStatus();

    stages.push({
      name: "发布完成",
      ok: true,
      output: `已推送到远程仓库。\n当前分支：${finalStatus.branch}`,
    });

    return NextResponse.json({
      ok: true,
      skipped: false,
      message: "发布成功，远程 CI/CD 将继续执行构建和部署流程。",
      stages,
    });
  } catch (error) {
    stages.push({
      name: "发布流程异常",
      ok: false,
      error: error instanceof Error ? error.message : "发布失败。",
    });

    return NextResponse.json(
      {
        ok: false,
        message: latestFailedStageMessage(stages),
        stages,
      },
      {
        status: 500,
      },
    );
  }
}