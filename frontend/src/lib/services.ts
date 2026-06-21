import data from "../data/services.json";

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

/**
 * Resolve a service's image URL by id. Images are served statically from the
 * assets folder (see frontend/src/index.ts dev route and build.ts copy step),
 * so the JSON `image` path is used directly — just normalised to an absolute
 * URL. Adding a new service needs no code change: drop assets/images/serv/{id}.png
 * and add the entry in services.json.
 */
export function getServiceImage(id: string | number): string | undefined {
  const image = getServiceById(id)?.image;
  if (!image) return undefined;
  return image.startsWith("/") ? image : `/${image}`;
}
