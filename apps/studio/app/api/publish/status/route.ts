import { NextResponse } from "next/server";

import { getGitStatus } from "../../../../lib/git";

export const runtime = "nodejs";

export async function GET() {
  try {
    const status = await getGitStatus();

    return NextResponse.json({
      ok: true,
      ...status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        branch: "",
        hasChanges: false,
        files: [],
        message:
          error instanceof Error ? error.message : "读取发布状态失败。",
      },
      {
        status: 500,
      },
    );
  }
}