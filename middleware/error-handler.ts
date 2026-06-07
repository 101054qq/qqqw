import type { Elysia } from "elysia";

/**
 * Store 操作錯誤碼 → HTTP 狀態碼 映射表
 * 集中管理所有錯誤碼的 HTTP 響應狀態
 */
export const STORE_ERROR_HTTP_STATUS: Record<string, number> = {
  ORDER_NOT_FOUND: 404,
  MENU_ITEM_NOT_FOUND: 404,
  ORDER_NOT_OWNED: 403,
  ORDER_NOT_EDITABLE: 409,
  EMPTY_ORDER: 400,
} as const;

/**
 * Store 操作錯誤碼 → 使用者訊息 映射表
 */
export const STORE_ERROR_MESSAGES: Record<string, string> = {
  ORDER_NOT_FOUND: "Order not found",
  MENU_ITEM_NOT_FOUND: "Menu item not found",
  ORDER_NOT_OWNED: "Forbidden",
  ORDER_NOT_EDITABLE: "Order is not editable",
  EMPTY_ORDER: "Empty order cannot be submitted",
} as const;

/**
 * 統一處理 Store 操作的 Result 結果
 * 自動根據 result.code 設定 HTTP 狀態碼和錯誤訊息
 *
 * @returns 錯誤時返回 error response，成功時返回 undefined（由呼叫端自行組裝 data）
 */
export function handleStoreResult<
  T extends { ok: boolean; code?: string },
>(result: T, set: { status: number }): { error: string } | undefined {
  if (!result.ok && result.code) {
    set.status = STORE_ERROR_HTTP_STATUS[result.code] ?? 500;
    return {
      error: STORE_ERROR_MESSAGES[result.code] ?? "Unexpected store state",
    };
  }
  return undefined;
}

/**
 * 全域錯誤處理 middleware
 * 捕捉 Validation 錯誤並返回結構化訊息
 */
export function registerGlobalErrorHandler(app: Elysia): void {
  app.onError(({ error, set, code }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        error: "Validation failed",
        message: error?.message ?? "Please check your request parameters",
      };
    }

    console.error("[Unhandled Error]", error);
    set.status = 500;
    return { error: "Internal server error" };
  });
}
