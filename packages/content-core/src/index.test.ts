import { describe, expect, it } from "vitest";
import { parsePost } from "./index";

const validPost = `---
title: Example
slug: example-post
summary: Example summary
publishedAt: "2026-07-22"
tags:
  - test
draft: false
---

# Hello`;

describe("parsePost", () => {
  it("parses valid frontmatter and content", () => {
    const post = parsePost(validPost, "example.md");
    expect(post.metadata.slug).toBe("example-post");
    expect(post.metadata.draft).toBe(false);
    expect(post.content).toBe("# Hello");
  });

  it("rejects unstable slugs", () => {
    expect(() => parsePost(validPost.replace("example-post", "Example Post"))).toThrow();
  });
});
