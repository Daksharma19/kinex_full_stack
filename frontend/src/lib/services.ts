import data from "../data/services.json";

/** A clinical service, sourced from src/data/services.json. */
export interface Service {
  id: string;
  image: string;
  title: string;
  shortDesc: string;
  longDesc: string;
}

export const services = data as Service[];

export function getServiceById(id: string): Service | undefined {
  return services.find((s) => s.id === id);
}
