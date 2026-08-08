import { spawn } from "node:child_process";

export type CommandResult = {
  command: string;
  args: string[];
  cwd: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

export type RunCommandOptions = {
  cwd: string;
  timeoutMs?: number;
  maxOutputLength?: number;
};

type SpawnTarget = {
  executable: string;
  args: string[];
  displayCommand: string;
  displayArgs: string[];
};

function trimOutput(output: string, maxLength: number): string {
  if (output.length <= maxLength) {
    return output;
  }

  return `${output.slice(0, 2000)}\n\n... 输出过长，已截断 ...\n\n${output.slice(
    -Math.max(2000, maxLength - 2500),
  )}`;
}

function normalizeEnv(command: string, args: string[]): NodeJS.ProcessEnv {
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      env[key] = value;
    }
  }

  env.CI = process.env.CI ?? "1";

  if (command === "pnpm" && ["check", "build"].includes(args[0] ?? "")) {
    delete env.NODE_ENV;
  }

  return env as NodeJS.ProcessEnv;
}

function getSpawnTarget(command: string, args: string[]): SpawnTarget {
  if (process.platform === "win32" && command === "pnpm") {
    return {
      executable: "cmd.exe",
      args: ["/d", "/s", "/c", "pnpm", ...args],
      displayCommand: command,
      displayArgs: args,
    };
  }

  return {
    executable: command,
    args,
    displayCommand: command,
    displayArgs: args,
  };
}

export async function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions,
): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const maxOutputLength = options.maxOutputLength ?? 60_000;
  const target = getSpawnTarget(command, args);

  return await new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;

    try {
      child = spawn(target.executable, target.args, {
        cwd: options.cwd,
        shell: false,
        windowsHide: true,
        env: normalizeEnv(command, args),
      });
    } catch (error) {
      resolve({
        command: target.displayCommand,
        args: target.displayArgs,
        cwd: options.cwd,
        exitCode: 1,
        stdout: "",
        stderr: error instanceof Error ? error.message : "命令启动失败。",
        timedOut: false,
      });

      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;

      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }

      setTimeout(() => {
        if (!settled) {
          try {
            child.kill("SIGKILL");
          } catch {
            // ignore
          }
        }
      }, 3_000);
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");

      if (stdout.length > maxOutputLength * 2) {
        stdout = stdout.slice(-maxOutputLength);
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");

      if (stderr.length > maxOutputLength * 2) {
        stderr = stderr.slice(-maxOutputLength);
      }
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);

      resolve({
        command: target.displayCommand,
        args: target.displayArgs,
        cwd: options.cwd,
        exitCode: 1,
        stdout: trimOutput(stdout, maxOutputLength),
        stderr: trimOutput(
          stderr || (error instanceof Error ? error.message : "命令执行失败。"),
          maxOutputLength,
        ),
        timedOut,
      });
    });

    child.on("close", (exitCode) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);

      resolve({
        command: target.displayCommand,
        args: target.displayArgs,
        cwd: options.cwd,
        exitCode,
        stdout: trimOutput(stdout, maxOutputLength),
        stderr: trimOutput(stderr, maxOutputLength),
        timedOut,
      });
    });
  });
}