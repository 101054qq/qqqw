import { JsonFileStore } from "./json/JsonFileStore.ts";
import type { Store } from "./Store.ts";

interface CreateStoreOptions {
  dataFilePath?: string;
}

export function createStore(options: CreateStoreOptions = {}): Store {
  const driver = process.env.STORE_DRIVER;

  if (driver === "postgres") {
    // 使用 dynamic import 避免 JSON store 模式時觸發 db/client.ts 的 DATABASE_URL 檢查
    const { PgStore } = require("./pg/PgStore.ts") as typeof import("./pg/PgStore.ts");
    return new PgStore({
      dataFilePath: options.dataFilePath ?? "./data/store.json",
    });
  }

  return new JsonFileStore({
    dataFilePath: options.dataFilePath ?? "./data/store.json",
  });
}

export type { Store } from "./Store.ts";
