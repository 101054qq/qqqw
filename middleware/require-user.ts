import { getCurrentUser } from "../auth/better-auth.ts";
import type { SessionUser } from "../shared/contracts.ts";

/**
 * 認證守衛 — 保護路由並獲取目前使用者
 * 若未登入則拋出 401 Response（由 Elysia onError 捕捉）
 */
export async function requireUser(request: Request): Promise<SessionUser> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}
