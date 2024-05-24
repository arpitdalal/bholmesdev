import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis/cloudflare";
import type { APIContext } from "astro";
import { ActionError } from "astro:actions";
import { db, eq, gt, Post, sql } from "astro:db";
import { createHash } from "node:crypto";

export async function checkIfRateLimited(
  ctx: Pick<APIContext, "request" | "locals">
): Promise<boolean> {
  const ip = import.meta.env.DEV
    ? "development"
    : ctx.request.headers.get("cf-connecting-ip");
  if (!ip) {
    throw new ActionError({
      code: "FORBIDDEN",
      message: "No header found for rate limiting.",
    });
  }

  const redis = Redis.fromEnv(ctx.locals.runtime.env);
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 d"),
  });
  const limited = await ratelimit.limit(ipHash);
  return !limited.success;
}

export async function updateLikes({
  postSlug,
  liked,
}: {
  postSlug: string;
  liked: boolean;
}): Promise<{ likes: number }> {
  const upsert = await db
    .insert(Post)
    .values({
      slug: postSlug,
      likes: liked ? 1 : 0,
    })
    .onConflictDoUpdate(
      liked
        ? {
            target: Post.slug,
            set: { likes: sql`likes + 1` },
          }
        : {
            target: Post.slug,
            set: { likes: sql`likes - 1` },
            where: gt(Post.likes, 0),
          }
    )
    .returning()
    .get();

  return upsert;
}

export async function getLikes(postSlug: string): Promise<number> {
  const post = await db
    .select({ likes: Post.likes })
    .from(Post)
    .where(eq(Post.slug, postSlug))
    .get();
  if (!post) return 0;

  return post.likes;
}
