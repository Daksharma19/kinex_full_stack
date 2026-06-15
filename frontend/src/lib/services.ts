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
