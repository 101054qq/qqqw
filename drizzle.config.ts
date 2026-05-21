import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts", // 請確認這是不是您 schema 的正確路徑
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // 🌟 關鍵：強制讓 Drizzle-kit 知道要管理 bf_v9 
  schemaFilter: ["public", "bf_v9"], 
});
