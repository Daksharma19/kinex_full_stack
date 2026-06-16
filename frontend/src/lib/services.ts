import data from "../data/services.json";

// Service images live in assets/images/serv/{id}.png. The Bun bundler resolves
// assets through static imports (a runtime string path wouldn't be served), so
// we import them eagerly and map them by id. The JSON `image` field mirrors
// these paths. When you add a new service image, add a matching import + entry.
import serv1 from "../../assets/images/serv/1.png";
import serv2 from "../../assets/images/serv/2.png";
import serv3 from "../../assets/images/serv/3.png";
import serv4 from "../../assets/images/serv/4.png";
import serv5 from "../../assets/images/serv/5.png";
import serv6 from "../../assets/images/serv/6.png";
import serv7 from "../../assets/images/serv/7.png";
import serv8 from "../../assets/images/serv/8.png";

/** Maps a service id (1..8) to its bundled image URL. */
const serviceImages: Record<number, string> = {
  1: serv1, 2: serv2, 3: serv3, 4: serv4,
  5: serv5, 6: serv6, 7: serv7, 8: serv8,
};

/** A clinical service, sourced from src/data/services.json. */
export interface Service {
  id: number;
  image: string;
  title: string;
  shortDesc: string;
  longDesc: string;
}

export const services = data as Service[];

/**
 * Look up a service by id. Route params arrive as strings (e.g. "/services/3"),
 * so accept either and compare numerically.
 */
export function getServiceById(id: string | number): Service | undefined {
  return services.find((s) => s.id === Number(id));
}

/** Resolve a service's bundled image URL by id (undefined if none imported). */
export function getServiceImage(id: string | number): string | undefined {
  return serviceImages[Number(id)];
}
