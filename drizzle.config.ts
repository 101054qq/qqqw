import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  // ⭕ 使用萬用字元，自動搜尋 src 目錄下（包含子資料夾）的所有 schema 檔案
  schema: "./src/**/schema*.ts", 
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ["public", "bf_v9"], 
});
