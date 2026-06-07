import { Elysia, type ElysiaHandler } from "elysia";
import type { Store } from "../store/Store.ts";
import {
  apiErrorResponseSchema,
  createMenuItemBodySchema,
  deleteMenuItemParamsSchema,
  menuItemResponseSchema,
  menuListResponseSchema,
  updateMenuItemBodySchema,
  updateMenuItemParamsSchema,
} from "../shared/route-schemas.ts";

/**
 * 菜單路由 — CRUD /api/menu
 */
export function menuRoutes(app: Elysia, store: Store): void {
  // GET /api/menu — 菜單列表
  app.get("/api/menu", () => ({ data: [...store.getMenu()] }), {
    detail: {
      tags: ["menu"],
      summary: "List menu items",
      description: "Return all available breakfast menu items.",
    },
    response: {
      200: menuListResponseSchema,
    },
  });

  // POST /api/menu — 新增菜品
  app.post(
    "/api/menu",
    async ({ body, set }) => {
      const newMenuItem = await store.createMenuItem(body);
      set.status = 201;
      return { data: newMenuItem };
    },
    {
      body: createMenuItemBodySchema,
      detail: {
        tags: ["menu"],
        summary: "Create a menu item",
        description: "Add a new menu item into the breakfast menu.",
      },
      response: {
        201: menuItemResponseSchema,
      },
    },
  );

  // PATCH /api/menu/:id — 更新菜品
  app.patch(
    "/api/menu/:id",
    async ({ params, body, set }) => {
      const menuId = parseInt(params.id);
      const menuItem = await store.updateMenuItem(menuId, body);

      if (!menuItem) {
        set.status = 404;
        return { error: "Menu item not found" };
      }

      return { data: menuItem };
    },
    {
      params: updateMenuItemParamsSchema,
      body: updateMenuItemBodySchema,
      detail: {
        tags: ["menu"],
        summary: "Update a menu item",
        description: "Update fields of an existing menu item.",
      },
      response: {
        200: menuItemResponseSchema,
        404: apiErrorResponseSchema,
      },
    },
  );

  // DELETE /api/menu/:id — 刪除菜品
  app.delete(
    "/api/menu/:id",
    async ({ params, set }) => {
      const menuId = parseInt(params.id);
      const removedMenuItem = await store.deleteMenuItem(menuId);

      if (!removedMenuItem) {
        set.status = 404;
        return { error: "Menu item not found" };
      }

      return { data: removedMenuItem };
    },
    {
      params: deleteMenuItemParamsSchema,
      detail: {
        tags: ["menu"],
        summary: "Delete a menu item",
        description: "Remove a menu item by id.",
      },
      response: {
        200: menuItemResponseSchema,
        404: apiErrorResponseSchema,
      },
    },
  );
}
