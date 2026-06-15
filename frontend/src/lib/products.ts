import data from "../data/products.json";

/** A catalog product, sourced from src/data/products.json. */
export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  image: string;
  tags: string[];
}

export const products = data as Product[];

/** Unique category names, in first-seen order, for the filter dropdown. */
export const categories: string[] = [...new Set(products.map((p) => p.category))];
