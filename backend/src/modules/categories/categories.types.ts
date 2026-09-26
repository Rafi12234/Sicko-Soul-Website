export type PublicCategory = {
  id: string;
  code: string;
  slug: string;
  indexCode: string | null;
  name: string;
  ghostName: string | null;
  spec: string | null;
  tagline: string | null;
  registry: string | null;
  coverUrl: string | null;
  coverAlt: string | null;
  sortOrder: number;
  productCount: number;
};
