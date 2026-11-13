"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import { useAdminSession } from "@/components/admin/AdminSessionProvider";
import { adminButton } from "@/components/admin/AdminShell";
import { apiRequest, type DataEnvelope } from "@/lib/apiClient";

type StockRow = {
  variantId: string;
  productId: string;
  productName: string;
  colorCode: string;
  sku: string;
  size: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  reorderLevel: number;
  lowStock: boolean;
  variantStatus: string;
};

type ProductChoice = { id: string; name: string };

const selectClass =
  "mt-2 min-h-12 w-full rounded-sm border border-white/30 bg-[#171719] px-3 py-3 text-base font-semibold text-white outline-none focus:border-red-500 disabled:opacity-45";
const stockOrder = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL"];
const naturalSizeSort = (a: StockRow, b: StockRow) => {
  const ai = stockOrder.indexOf(a.size.toUpperCase());
  const bi = stockOrder.indexOf(b.size.toUpperCase());
  if (ai !== -1 || bi !== -1) {
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  }
  return a.size.localeCompare(b.size, undefined, { numeric: true });
};
const colorLabel = (code: string) => code.replaceAll("_", " ");

export default function InventoryManager() {
  const { token } = useAdminSession();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [productId, setProductId] = useState("");
  const [colorCode, setColorCode] = useState("");
  const [variantId, setVariantId] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const read = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<DataEnvelope<StockRow[]>>("/admin/inventory", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load inventory. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void read(); }, [read]);

  // All options are derived from admin-only inventory data, not the public API.
  const products = useMemo<ProductChoice[]>(() => {
    const found = new Map<string, string>();
    for (const row of rows) found.set(row.productId, row.productName);
    return [...found].map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);
  const chosenProductId = products.some((product) => product.id === productId)
    ? productId : (products[0]?.id ?? "");
  const productRows = useMemo(
    () => rows.filter((row) => row.productId === chosenProductId),
    [rows, chosenProductId],
  );
  const colors = useMemo(() => [...new Set(productRows.map((row) => row.colorCode || "BLACK"))]
    .sort((a, b) => a === "BLACK" ? -1 : b === "BLACK" ? 1 : a.localeCompare(b)), [productRows]);
  const chosenColor = colors.includes(colorCode) ? colorCode : (colors[0] ?? "");
  const sizeRows = useMemo(() => productRows.filter((row) => (row.colorCode || "BLACK") === chosenColor).sort(naturalSizeSort),
    [productRows, chosenColor]);
  const selected = sizeRows.find((row) => row.variantId === variantId) ?? sizeRows[0] ?? null;

  // When the admin switches product, colour, or size, show that record's physical stock.
  useEffect(() => {
    setDraft(selected === null ? "" : String(selected.onHandQty));
  }, [selected?.variantId, selected?.onHandQty]);

  function chooseProduct(next: string) {
    setProductId(next);
    setColorCode("");
    setVariantId("");
    setNotice("");
    setError("");
  }
  function chooseColor(next: string) {
    setColorCode(next);
    setVariantId("");
    setNotice("");
    setError("");
  }
  function chooseSize(next: string) {
    setVariantId(next);
    setNotice("");
    setError("");
  }

  async function save() {
    if (!selected || busy || !token) return;
    const next = Number(draft);
    if (draft.trim() === "" || !Number.isSafeInteger(next) || next < 0 || next > 100000) {
      setError("Enter a whole number between 0 and 100,000.");
      return;
    }
    if (next < selected.reservedQty) {
      setError(`At least ${selected.reservedQty} units are reserved. Total physical stock cannot be below that amount.`);
      return;
    }
    const delta = next - selected.onHandQty;
    if (delta === 0) {
      setNotice("No changes needed — the stock quantity is already correct.");
      return;
    }
    if (!window.confirm(
      `Update stock for ${selected.productName} / ${colorLabel(chosenColor)} / ${selected.size}?\n\n` +
      `Current physical stock: ${selected.onHandQty}\nNew physical stock: ${next}\n\nSave this change?`,
    )) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/admin/inventory/${encodeURIComponent(selected.variantId)}/adjust`, {
        method: "POST",
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          movementType: delta > 0 ? "RESTOCK" : "ADJUSTMENT",
          onHandDelta: delta,
          reservedDelta: 0,
          note: `Stock updated by admin: ${selected.productName} / ${chosenColor} / ${selected.size}`,
        }),
      });
      await read();
      setNotice(`${selected.productName} · ${colorLabel(chosenColor)} · ${selected.size}: stock saved successfully.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Stock could not be updated. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <AdminPageHeading eyebrow="Commerce / Inventory" title="MANAGE STOCK"
      description="Choose a product, colour and size. You will see the stock for only that selection. Customers never see these numbers." />

    {error && <p role="alert" className="mb-4 border-l-2 border-red-500 bg-red-950/30 p-4 text-sm text-red-100">{error}</p>}
    {notice && <p role="status" className="mb-4 border-l-2 border-emerald-500 bg-emerald-950/20 p-4 text-sm text-emerald-200">{notice}</p>}

    {loading && rows.length === 0 ? <p role="status" className="border border-white/15 p-6 text-white/70">Loading product inventory…</p>
      : products.length === 0 ? <div className="border border-white/15 bg-[#141416] p-6">
        <p className="font-semibold">No current products with stock records.</p>
        <p className="mt-2 text-sm text-white/60">Add products and their sizes in Admin → Products. Archived products are hidden here.</p>
        <button type="button" className={`${adminButton} mt-5`} disabled={busy || loading} onClick={() => void read()}>Refresh stock</button>
      </div> : <>
        <section className="border border-white/15 bg-[#141416] p-4 sm:p-6" aria-labelledby="choose-stock-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="choose-stock-title" className="font-display text-2xl uppercase">1. CHOOSE THE PRODUCT</h2>
              <p className="mt-1 text-sm text-white/55">{products.length} current products. Archived demo products are excluded.</p>
            </div>
            <button type="button" className={adminButton} disabled={busy || loading} onClick={() => void read()}>Refresh</button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/65" htmlFor="inventory-product">
              Product
              <select id="inventory-product" className={selectClass} value={chosenProductId} disabled={busy || loading} onChange={(e) => chooseProduct(e.target.value)}>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/65" htmlFor="inventory-colour">
              Colour
              <select id="inventory-colour" className={selectClass} value={chosenColor} disabled={busy || loading} onChange={(e) => chooseColor(e.target.value)}>
                {colors.map((color) => <option key={color} value={color}>{colorLabel(color)}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-widest text-white/65" htmlFor="inventory-size">
              Size
              <select id="inventory-size" className={selectClass} value={selected?.variantId ?? ""} disabled={busy || loading} onChange={(e) => chooseSize(e.target.value)}>
                {sizeRows.map((row) => <option key={row.variantId} value={row.variantId}>{row.size}</option>)}
              </select>
            </label>
          </div>
        </section>

        {selected && <section className="mt-5 border border-white/15 bg-[#141416] p-4 sm:p-6" aria-labelledby="selected-stock-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="selected-stock-title" className="font-display text-2xl uppercase">2. CHECK THE STOCK</h2>
              <p className="mt-2 text-sm text-white/65">{selected.productName} <span aria-hidden="true">/</span> {colorLabel(chosenColor)} <span aria-hidden="true">/</span> Size {selected.size}</p>
            </div>
            <span className={`border px-3 py-2 text-xs font-bold uppercase tracking-wide ${selected.availableQty > 0 ? "border-emerald-500/50 text-emerald-300" : "border-amber-500/50 text-amber-300"}`}>
              {selected.availableQty > 0 ? "In stock" : "Sold out"}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-live="polite">
            <div className="border border-white/15 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-wide text-white/55">Physical stock</p>
              <p className="mt-2 font-display text-4xl">{selected.onHandQty}</p>
              <p className="mt-1 text-xs text-white/50">Total units in your shop</p>
            </div>
            <div className="border border-white/15 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-wide text-white/55">Reserved</p>
              <p className="mt-2 font-display text-4xl">{selected.reservedQty}</p>
              <p className="mt-1 text-xs text-white/50">Set aside for existing orders</p>
            </div>
            <div className="border border-white/15 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-wide text-white/55">Ready to sell</p>
              <p className="mt-2 font-display text-4xl text-emerald-300">{selected.availableQty}</p>
              <p className="mt-1 text-xs text-white/50">Physical stock minus reserved</p>
            </div>
          </div>

          <div className="mt-6 border-t border-white/15 pt-6">
            <h3 className="font-display text-xl uppercase">3. UPDATE STOCK</h3>
            <p className="mt-1 text-sm text-white/60">Count the physical units you have for this colour and size, then enter the new total below.</p>
            <div className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1 text-xs font-semibold uppercase tracking-wide text-white/65" htmlFor="stock-new-total">
                New physical stock total
                <input id="stock-new-total" type="number" inputMode="numeric" min={selected.reservedQty} max="100000" step="1" className={selectClass}
                  value={draft} disabled={busy || loading} onChange={(event) => { setDraft(event.target.value); setError(""); setNotice(""); }} />
              </label>
              <button type="button" className={`${adminButton} min-h-12 px-6`} disabled={busy || loading || draft.trim() === ""} onClick={() => void save()}>
                {busy ? "Saving…" : "Save stock"}
              </button>
            </div>
            <p className="mt-3 text-xs text-white/50">You cannot set physical stock lower than reserved units. Updates are recorded in the inventory history.</p>
          </div>
        </section>}
      </>}
  </>;
}
