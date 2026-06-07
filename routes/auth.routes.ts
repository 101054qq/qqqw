import { Elysia } from "elysia";
import { auth } from "../auth/better-auth.ts";

/**
 * 認證路由 — Better Auth handler + Sign-out proxy
 */
export function authRoutes(app: Elysia): void {
  // ─── Better Auth wildcard 路由 ────────────────────────────────────
  // 使用 wildcard 路由處理 GET 和 POST，讓 Better Auth 自行匹配子路徑
  // 注意：不能用 app.mount()，因為 Better Auth handler 是標準 fetch handler
  app.get("/api/auth/*", ({ request }) => auth.handler(request));
  app.post("/api/auth/*", ({ request }) => auth.handler(request));

  // ─── Sign-out Proxy ──────────────────────────────────────────────
  // Better Auth 的 /api/auth/sign-out 有 CSRF origin 驗證。
  // production 環境若 BETTER_AUTH_URL 設定錯誤，瀏覽器 Origin 不在白名單內
  // 會造成「假登出」（前端以為成功，實際 session 仍在）。
  //
  // 解法：以 server 信任的 baseURL 當 Origin 轉發給 Better Auth。
  // 安全性：session 識別仍靠 cookie，CSRF bypass 只在 server 端發生。
  app.post("/api/sign-out", async ({ request }) => {
    const baBaseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

    const proxiedHeaders = new Headers(request.headers);
    proxiedHeaders.set("origin", baBaseUrl);

    const proxiedRequest = new Request(`${baBaseUrl}/api/auth/sign-out`, {
      method: "POST",
      headers: proxiedHeaders,
    });

    const res = await auth.handler(proxiedRequest);
    if (!res.ok) {
      const body = await res.clone().text().catch(() => "(unreadable)");
      console.error(
        `[sign-out proxy] Better Auth returned ${res.status}:`,
        body,
      );
    }
    return res;
  });
}
