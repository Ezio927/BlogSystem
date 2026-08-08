import { rename, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeFileAtomic(
  targetPath: string,
  content: string,
): Promise<void> {
  const directory = path.dirname(targetPath);
  const fileName = path.basename(targetPath);

  const tempPath = path.join(
    directory,
    `.${fileName}.${process.pid}.${Date.now()}.tmp`,
  );

  await writeFile(tempPath, content, "utf8");
  await rename(tempPath, targetPath);
}