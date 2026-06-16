import data from "../data/products.json";

// Product photos live in assets/images/products/{id}.png. The Bun bundler
// resolves assets through static imports (a runtime string path wouldn't be
// served), so we import them eagerly and map them by id. The JSON `image` field
// mirrors these paths and is the source of truth for which file each product
// uses. When you add a new product image, add a matching import + map entry.
import img1 from "../../assets/images/products/1.png";
import img2 from "../../assets/images/products/2.png";
import img3 from "../../assets/images/products/3.png";
import img4 from "../../assets/images/products/4.png";
import img5 from "../../assets/images/products/5.png";
import img6 from "../../assets/images/products/6.png";
import img7 from "../../assets/images/products/7.png";
import img8 from "../../assets/images/products/8.png";
import img9 from "../../assets/images/products/9.png";
import img10 from "../../assets/images/products/10.png";
import img11 from "../../assets/images/products/11.png";
import img12 from "../../assets/images/products/12.png";
import img13 from "../../assets/images/products/13.png";
import img14 from "../../assets/images/products/14.png";
import img15 from "../../assets/images/products/15.png";
import img16 from "../../assets/images/products/16.png";
import img17 from "../../assets/images/products/17.png";
import img18 from "../../assets/images/products/18.png";
import img19 from "../../assets/images/products/19.png";
import img20 from "../../assets/images/products/20.png";
import img21 from "../../assets/images/products/21.png";
import img22 from "../../assets/images/products/22.png";
import img23 from "../../assets/images/products/23.png";
import img24 from "../../assets/images/products/24.png";

/** Maps a product id ("1".."24") to its bundled image URL. */
const productImages: Record<string, string> = {
  "1": img1, "2": img2, "3": img3, "4": img4, "5": img5, "6": img6,
  "7": img7, "8": img8, "9": img9, "10": img10, "11": img11, "12": img12,
  "13": img13, "14": img14, "15": img15, "16": img16, "17": img17, "18": img18,
  "19": img19, "20": img20, "21": img21, "22": img22, "23": img23, "24": img24,
};

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

/** Resolve a product's bundled image URL by id (undefined if none imported). */
export function getProductImage(id: string): string | undefined {
  return productImages[id];
}
