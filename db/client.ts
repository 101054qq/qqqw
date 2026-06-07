import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema.ts";
import * as authSchema from "./auth-schema.ts";

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    // 若使用 JSON store 模式（STORE_DRIVER=json），
    // 仍可能有模組（如 auth/better-auth.ts）import 此檔案。
    // 改用 console.warn 而非 throw，延遲到實際查詢 DB 時才報錯。
    console.warn(
      "⚠️ DATABASE_URL not set. DB operations will fail at runtime.",
    );
    return null;
  }

  const pool = new Pool({ connectionString: databaseUrl });

  return drizzle({
    client: pool,
    schema: { ...schema, ...authSchema },
  });
}

export const db = createDb();
