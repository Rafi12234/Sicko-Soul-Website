import { mapPublicCategory } from "./categories.mapper.js";
import { listPublicCategories } from "./categories.repository.js";
import type { PublicCategory } from "./categories.types.js";

export async function getPublicCategories(): Promise<PublicCategory[]> {
  const rows = await listPublicCategories();
  return rows.map(mapPublicCategory);
}
