import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  // ⭕ 修正為正確的根目錄 db 路徑
  schema: "./db/schema.ts", 
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // 🌟 確保管理 bf_v9 的 Schema 空間
  schemaFilter: ["public", "bf_v9"], 
});
