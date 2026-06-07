import type { Elysia } from "elysia";
import toTaipeiDateTime from "../util.ts";

/**
 * 請求記錄 middleware
 * 在每個請求到達時輸出時間戳和方法/路徑
 */
export function registerRequestLogger(app: Elysia): void {
  app.onRequest(({ request }) => {
    console.log(
      `[${toTaipeiDateTime(new Date().toISOString())}] ${request.method} ${new URL(request.url).pathname}`,
    );
  });
}
