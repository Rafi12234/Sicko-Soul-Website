import type { Prisma, inventory_movements_movement_type } from "../../../generated/prisma/client.js";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { recordAudit } from "../../services/audit.service.js";
import type { AuditContext } from "../../types/auth.js";
import { decimalToNumber } from "../../utils/decimal.js";
import {
  getInventoryMovementRows,
  listInventoryRows,
  lockStockRows,
} from "./inventory.repository.js";

export type InventoryQuantity = {
  variantId: bigint;
  quantity: number;
};

function stockMap(rows: Array<{ variant_id: bigint; on_hand_qty: number; reserved_qty: number }>) {
  return new Map(rows.map((row) => [row.variant_id.toString(), row]));
}

export async function lockAndVerifyAvailableStock(
  tx: Prisma.TransactionClient,
  lines: InventoryQuantity[],
): Promise<void> {
  const rows = await lockStockRows(tx, lines.map((line) => line.variantId));
  const byId = stockMap(rows);

  for (const line of lines) {
    const row = byId.get(line.variantId.toString());
    if (!row) {
      throw new AppError({
        statusCode: 409,
        code: "INVENTORY_NOT_INITIALIZED",
        message: `Inventory is not initialized for variant ${line.variantId.toString()}.`,
      });
    }

    const available = row.on_hand_qty - row.reserved_qty;
    if (available < line.quantity) {
      throw new AppError({
        statusCode: 409,
        code: "INSUFFICIENT_STOCK",
        message: "One or more selected sizes no longer have enough available stock.",
        details: {
          variantId: line.variantId.toString(),
          requested: line.quantity,
          available: Math.max(0, available),
        },
      });
    }
  }
}

export async function reserveStock(
  tx: Prisma.TransactionClient,
  lines: InventoryQuantity[],
  orderId: bigint,
): Promise<void> {
  for (const line of lines) {
    await tx.inventory_stock.update({
      where: { variant_id: line.variantId },
      data: { reserved_qty: { increment: line.quantity } },
    });
    await tx.inventory_movements.create({
      data: {
        variant_id: line.variantId,
        movement_type: "RESERVE",
        on_hand_delta: 0,
        reserved_delta: line.quantity,
        reference_type: "ORDER",
        reference_id: orderId,
        note: "Stock reserved for order.",
      },
    });
  }
}

export async function consumeReservedStock(
  tx: Prisma.TransactionClient,
  lines: InventoryQuantity[],
  orderId: bigint,
  staffId: bigint,
): Promise<void> {
  const rows = await lockStockRows(tx, lines.map((line) => line.variantId));
  const byId = stockMap(rows);

  for (const line of lines) {
    const row = byId.get(line.variantId.toString());
    if (!row || row.on_hand_qty < line.quantity || row.reserved_qty < line.quantity) {
      throw new AppError({
        statusCode: 409,
        code: "INVENTORY_STATE_CONFLICT",
        message: "Reserved inventory cannot be converted to a confirmed sale.",
        details: { variantId: line.variantId.toString() },
      });
    }
    await tx.inventory_stock.update({
      where: { variant_id: line.variantId },
      data: {
        on_hand_qty: { decrement: line.quantity },
        reserved_qty: { decrement: line.quantity },
      },
    });
    await tx.inventory_movements.create({
      data: {
        variant_id: line.variantId,
        movement_type: "SALE",
        on_hand_delta: -line.quantity,
        reserved_delta: -line.quantity,
        reference_type: "ORDER",
        reference_id: orderId,
        note: "Reserved stock converted to confirmed sale.",
        created_by_staff_id: staffId,
      },
    });
  }
}

export async function releaseReservedStock(
  tx: Prisma.TransactionClient,
  lines: InventoryQuantity[],
  orderId: bigint,
  staffId?: bigint,
): Promise<void> {
  const rows = await lockStockRows(tx, lines.map((line) => line.variantId));
  const byId = stockMap(rows);

  for (const line of lines) {
    const row = byId.get(line.variantId.toString());
    if (!row || row.reserved_qty < line.quantity) {
      throw new AppError({
        statusCode: 409,
        code: "INVENTORY_STATE_CONFLICT",
        message: "Reserved inventory cannot be released safely.",
        details: { variantId: line.variantId.toString() },
      });
    }
    await tx.inventory_stock.update({
      where: { variant_id: line.variantId },
      data: { reserved_qty: { decrement: line.quantity } },
    });
    await tx.inventory_movements.create({
      data: {
        variant_id: line.variantId,
        movement_type: "RELEASE",
        on_hand_delta: 0,
        reserved_delta: -line.quantity,
        reference_type: "ORDER",
        reference_id: orderId,
        note: "Order reservation released.",
        created_by_staff_id: staffId ?? null,
      },
    });
  }
}

export async function returnSoldStock(
  tx: Prisma.TransactionClient,
  lines: InventoryQuantity[],
  orderId: bigint,
  staffId: bigint,
): Promise<void> {
  await lockStockRows(tx, lines.map((line) => line.variantId));
  for (const line of lines) {
    await tx.inventory_stock.update({
      where: { variant_id: line.variantId },
      data: { on_hand_qty: { increment: line.quantity } },
    });
    await tx.inventory_movements.create({
      data: {
        variant_id: line.variantId,
        movement_type: "RETURN",
        on_hand_delta: line.quantity,
        reserved_delta: 0,
        reference_type: "ORDER",
        reference_id: orderId,
        note: "Stock returned from cancelled/returned order.",
        created_by_staff_id: staffId,
      },
    });
  }
}

export async function listInventory(input: { q?: string | undefined; lowStock?: "true" | "false" | undefined }) {
  const rows = await listInventoryRows(input.q);
  const mapped = rows.map((row) => {
    const availableQty = Math.max(0, row.on_hand_qty - row.reserved_qty);
    return {
      variantId: row.variant_id.toString(),
      productId: row.product_variants.products.public_id,
      productName: row.product_variants.products.name,
      sku: row.product_variants.sku,
      size: row.product_variants.sizes.code,
      variantStatus: row.product_variants.status,
      basePrice: decimalToNumber(row.product_variants.products.base_price),
      currency: row.product_variants.products.currency,
      onHandQty: row.on_hand_qty,
      reservedQty: row.reserved_qty,
      availableQty,
      reorderLevel: row.reorder_level,
      lowStock: availableQty <= row.reorder_level,
      updatedAt: row.updated_at.toISOString(),
    };
  });
  return input.lowStock === "true" ? mapped.filter((row) => row.lowStock) : mapped;
}

export async function adjustInventory(
  variantId: bigint,
  input: {
    movementType: "RESTOCK" | "RETURN" | "ADJUSTMENT";
    onHandDelta: number;
    reservedDelta: number;
    reorderLevel?: number | undefined;
    note?: string | undefined;
  },
  audit: AuditContext,
) {
  const result = await prisma.$transaction(async (tx) => {
    const [locked] = await lockStockRows(tx, [variantId]);
    if (!locked) {
      throw new AppError({
        statusCode: 404,
        code: "INVENTORY_NOT_FOUND",
        message: "Inventory row was not found.",
      });
    }

    const nextOnHand = locked.on_hand_qty + input.onHandDelta;
    const nextReserved = locked.reserved_qty + input.reservedDelta;
    if (nextOnHand < 0 || nextReserved < 0 || nextReserved > nextOnHand) {
      throw new AppError({
        statusCode: 422,
        code: "INVALID_INVENTORY_ADJUSTMENT",
        message: "The inventory adjustment would create an invalid stock state.",
        details: { nextOnHand, nextReserved },
      });
    }

    const row = await tx.inventory_stock.update({
      where: { variant_id: variantId },
      data: {
        on_hand_qty: nextOnHand,
        reserved_qty: nextReserved,
        ...(input.reorderLevel !== undefined ? { reorder_level: input.reorderLevel } : {}),
      },
    });

    await tx.inventory_movements.create({
      data: {
        variant_id: variantId,
        movement_type: input.movementType as inventory_movements_movement_type,
        on_hand_delta: input.onHandDelta,
        reserved_delta: input.reservedDelta,
        reference_type: "MANUAL",
        note: input.note ?? null,
        created_by_staff_id: audit.staff.id,
      },
    });

    await recordAudit(
      audit,
      {
        action: "INVENTORY_ADJUST",
        entityType: "variant",
        entityId: variantId,
        oldData: locked,
        newData: row,
      },
      tx,
    );

    return row;
  });

  return {
    variantId: result.variant_id.toString(),
    onHandQty: result.on_hand_qty,
    reservedQty: result.reserved_qty,
    availableQty: Math.max(0, result.on_hand_qty - result.reserved_qty),
    reorderLevel: result.reorder_level,
  };
}

export async function getInventoryMovements(variantId: bigint) {
  const rows = await getInventoryMovementRows(variantId);
  return rows.map((row) => ({
    id: row.movement_id.toString(),
    movementType: row.movement_type,
    onHandDelta: row.on_hand_delta,
    reservedDelta: row.reserved_delta,
    referenceType: row.reference_type,
    referenceId: row.reference_id?.toString() ?? null,
    note: row.note,
    createdBy: row.staff_users
      ? { name: row.staff_users.full_name, email: row.staff_users.email }
      : null,
    createdAt: row.created_at.toISOString(),
  }));
}
