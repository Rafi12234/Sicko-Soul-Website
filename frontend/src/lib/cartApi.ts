import { apiRequest, type DataEnvelope } from "@/lib/apiClient";
import type { ServerCartRecord } from "@/types/commerce";

export async function createOrResumeCart(cartToken?: string | null) {
  const result = await apiRequest<DataEnvelope<ServerCartRecord>>("/carts", {
    method: "POST",
    body: JSON.stringify(cartToken ? { cartToken } : {}),
  });
  return result.data;
}

export async function getServerCart(cartToken: string) {
  const result = await apiRequest<DataEnvelope<ServerCartRecord>>(
    `/carts/${encodeURIComponent(cartToken)}`,
    { cache: "no-store" },
  );
  return result.data;
}

export async function addServerCartItem(cartToken: string, variantId: string, quantity = 1) {
  const result = await apiRequest<DataEnvelope<ServerCartRecord>>(
    `/carts/${encodeURIComponent(cartToken)}/items`,
    {
      method: "POST",
      body: JSON.stringify({ variantId, quantity }),
    },
  );
  return result.data;
}

export async function updateServerCartItem(
  cartToken: string,
  itemId: string,
  input: { quantity?: number; variantId?: string },
) {
  const result = await apiRequest<DataEnvelope<ServerCartRecord>>(
    `/carts/${encodeURIComponent(cartToken)}/items/${encodeURIComponent(itemId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return result.data;
}

export async function removeServerCartItem(cartToken: string, itemId: string) {
  const result = await apiRequest<DataEnvelope<ServerCartRecord>>(
    `/carts/${encodeURIComponent(cartToken)}/items/${encodeURIComponent(itemId)}`,
    { method: "DELETE" },
  );
  return result.data;
}
