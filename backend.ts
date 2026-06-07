import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { cors } from "@elysia/cors";
import { existsSync } from "node:fs";

import { createStore } from "./store/index.ts";
import { registerRequestLogger } from "./middleware/request-logger.ts";
import { registerGlobalErrorHandler } from "./middleware/error-handler.ts";
import { authRoutes } from "./routes/auth.routes.ts";
import { menuRoutes } from "./routes/menu.routes.ts";
import { orderRoutes } from "./routes/orders.routes.ts";
import { healthResponseSchema } from "./shared/route-schemas.ts";

// ─── 配置 ────────────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "localhost";
const allowedOrigin = process.env.API_ALLOWED_ORIGIN || "*";
const store = createStore({ dataFilePath: "./data/store.json" });
const hasPublicAssets =
  existsSync("./public") && existsSync("./public/index.html");

// ─── App 初始化 ──────────────────────────────────────────────────────────────
const app = new Elysia();

// ─── CORS Plugin ──────────────────────────────────────────────────────────────
app.use(
  cors({
    origin:
      allowedOrigin === "*" ? "*" : allowedOrigin || "http://localhost:5173",
    credentials: allowedOrigin !== "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── OpenAPI Plugin ───────────────────────────────────────────────────────────
app.use(
  openapi({
    path: "/openapi",
    specPath: "/openapi/json",
    documentation: {
      info: {
        title: "Breakfast Demo API",
        version: "0.3.0",
        description:
          "Breakfast ordering demo API. V10 refactor: routes/middleware separation, Result<T,E> error handling.",
      },
      tags: [
        { name: "auth", description: "Authentication endpoints" },
        { name: "menu", description: "Menu management endpoints" },
        { name: "orders", description: "Order query and mutation endpoints" },
        { name: "system", description: "System and health check endpoints" },
      ],
    },
    exclude: {
      staticFile: true,
      paths: ["/openapi", "/openapi/json"],
    },
  }),
);

// ─── 全域中介層 ──────────────────────────────────────────────────────────────
registerRequestLogger(app);

// ─── 路由註冊 ────────────────────────────────────────────────────────────────
authRoutes(app);
menuRoutes(app, store);
orderRoutes(app, store);

// ─── 健康檢查 ────────────────────────────────────────────────────────────────
app.get("/health", () => ({ status: "ok" }), {
  detail: {
    tags: ["system"],
    summary: "Health check",
    description: "Return API health status.",
  },
  response: {
    200: healthResponseSchema,
  },
});

// ─── 靜態檔案 & SPA Fallback ─────────────────────────────────────────────────
if (hasPublicAssets) {
  app.get("*", async ({ request }) => {
    const pathname = new URL(request.url).pathname;

    if (pathname.startsWith("/api/") || pathname.startsWith("/openapi")) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const staticFile = Bun.file(`./public${pathname}`);
    if (pathname !== "/" && (await staticFile.exists())) {
      return staticFile;
    }

    return Bun.file("./public/index.html");
  });
}

// ─── 全域錯誤處理 ────────────────────────────────────────────────────────────
registerGlobalErrorHandler(app);

// ─── 啟動 ────────────────────────────────────────────────────────────────────
await store.init();

app.listen(port, () => {
  console.log(`🍳 早餐店 API 運行在 http://${host}:${port}`);
  console.log(`🌐 Web App: http://${host}:${port}`);
  console.log(`📋 菜單 API: http://${host}:${port}/api/menu`);
  console.log(`📦 訂單 API: http://${host}:${port}/api/orders`);
  console.log(`💚 健康檢查: http://${host}:${port}/health`);
  console.log(`🔐 CORS Origin: ${allowedOrigin}`);
  if (!hasPublicAssets) {
    console.log(
      "⚠️ public/ 不存在，目前只提供 API。若要提供前端頁面，先執行 bun run build:frontend",
    );
  }
});
