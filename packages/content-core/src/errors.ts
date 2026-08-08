export class ContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentError";
  }
}

export class PostFrontmatterError extends ContentError {
  constructor(fileName: string, message: string) {
    super(`文章 ${fileName} 的 frontmatter 无效：${message}`);
    this.name = "PostFrontmatterError";
  }
}

export class DuplicateSlugError extends ContentError {
  constructor(details: string) {
    super(`存在重复的文章 slug：${details}`);
    this.name = "DuplicateSlugError";
  }
}