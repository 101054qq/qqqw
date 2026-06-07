import { Elysia } from "elysia";
import type { Store } from "../store/Store.ts";
import {
  apiErrorResponseSchema,
  getOrderByIdParamsSchema,
  nullableOrderResponseEnvelopeSchema,
  orderListResponseSchema,
  orderResponseEnvelopeSchema,
  submitOrderParamsSchema,
  toOrderResponse,
  updateOrderBodySchema,
  updateOrderParamsSchema,
} from "../shared/route-schemas.ts";
import { requireUser } from "../middleware/require-user.ts";
import { handleStoreResult } from "../middleware/error-handler.ts";

/**
 * 訂單路由 — /api/orders/*
 * 狀態機：pending → submitted
 */
export function orderRoutes(app: Elysia, store: Store): void {
  // GET /api/orders — 所有訂單列表（管理用途）
  app.get(
    "/api/orders",
    () => ({
      data: store.getOrders().map(toOrderResponse),
    }),
    {
      detail: {
        tags: ["orders"],
        summary: "List all orders",
        description: "Return all orders stored in the demo backend.",
      },
      response: {
        200: orderListResponseSchema,
      },
    },
  );

  // GET /api/orders/current — 當前 pending 訂單
  app.get(
    "/api/orders/current",
    async ({ request }) => {
      const user = await requireUser(request);
      const currentOrder = store.getCurrentOrderByUserId(user.id);
      return { data: currentOrder ? toOrderResponse(currentOrder) : null };
    },
    {
      detail: {
        tags: ["orders"],
        summary: "Get current order",
        description:
          "Return the current pending order of a user, or null if none exists.",
      },
      response: {
        200: nullableOrderResponseEnvelopeSchema,
        401: apiErrorResponseSchema,
      },
    },
  );

  // GET /api/orders/history — 歷史已提交訂單
  app.get(
    "/api/orders/history",
    async ({ request }) => {
      const user = await requireUser(request);
      return {
        data: store.getOrderHistoryByUserId(user.id).map(toOrderResponse),
      };
    },
    {
      detail: {
        tags: ["orders"],
        summary: "Get order history",
        description: "Return submitted orders belonging to a user.",
      },
      response: {
        200: orderListResponseSchema,
        401: apiErrorResponseSchema,
      },
    },
  );

  // POST /api/orders — 建立或復用訂單
  app.post(
    "/api/orders",
    async ({ request, set }) => {
      const user = await requireUser(request);
      const existingOrder = store.getCurrentOrderByUserId(user.id);
      if (existingOrder) {
        return { data: toOrderResponse(existingOrder) };
      }

      const newOrder = await store.createOrder({ userId: user.id });
      set.status = 201;
      return { data: toOrderResponse(newOrder) };
    },
    {
      detail: {
        tags: ["orders"],
        summary: "Create or reuse current order",
        description:
          "Create a new pending order, or return the existing pending order for the user.",
      },
      response: {
        200: orderResponseEnvelopeSchema,
        201: orderResponseEnvelopeSchema,
        401: apiErrorResponseSchema,
      },
    },
  );

  // GET /api/orders/:id — 單筆訂單
  app.get(
    "/api/orders/:id",
    async ({ params, request, set }) => {
      const user = await requireUser(request);
      const orderId = parseInt(params.id, 10);
      const order = store.getOrderById(orderId);

      if (!order) {
        set.status = 404;
        return { error: "Order not found" };
      }

      if (order.userId !== user.id) {
        set.status = 403;
        return { error: "Forbidden" };
      }

      return { data: toOrderResponse(order) };
    },
    {
      params: getOrderByIdParamsSchema,
      detail: {
        tags: ["orders"],
        summary: "Get order by id",
        description:
          "Return a single order when it belongs to the requested user.",
      },
      response: {
        200: orderResponseEnvelopeSchema,
        401: apiErrorResponseSchema,
        403: apiErrorResponseSchema,
        404: apiErrorResponseSchema,
      },
    },
  );

  // PATCH /api/orders/:id — 修改訂單項目數量
  app.patch(
    "/api/orders/:id",
    async ({ params, body, request, set }) => {
      const user = await requireUser(request);
      const orderId = parseInt(params.id);
      const result = await store.updateOrderItem(orderId, {
        userId: user.id,
        itemId: body.itemId,
        qty: body.qty,
      });

      const err = handleStoreResult(result, set);
      if (err) return err;

      return { data: toOrderResponse(result.order) };
    },
    {
      params: updateOrderParamsSchema,
      body: updateOrderBodySchema,
      detail: {
        tags: ["orders"],
        summary: "Update order item quantity",
        description: "Set the quantity of a menu item within a pending order.",
      },
      response: {
        200: orderResponseEnvelopeSchema,
        401: apiErrorResponseSchema,
        403: apiErrorResponseSchema,
        404: apiErrorResponseSchema,
        409: apiErrorResponseSchema,
        500: apiErrorResponseSchema,
      },
    },
  );

  // POST /api/orders/:id/submit — 提交訂單
  app.post(
    "/api/orders/:id/submit",
    async ({ params, request, set }) => {
      const user = await requireUser(request);
      const orderId = parseInt(params.id, 10);
      const result = await store.submitOrder(orderId, { userId: user.id });

      const err = handleStoreResult(result, set);
      if (err) return err;

      return { data: toOrderResponse(result.order) };
    },
    {
      params: submitOrderParamsSchema,
      detail: {
        tags: ["orders"],
        summary: "Submit order",
        description: "Submit a pending order that belongs to the user.",
      },
      response: {
        200: orderResponseEnvelopeSchema,
        400: apiErrorResponseSchema,
        401: apiErrorResponseSchema,
        403: apiErrorResponseSchema,
        404: apiErrorResponseSchema,
        409: apiErrorResponseSchema,
        500: apiErrorResponseSchema,
      },
    },
  );
}
