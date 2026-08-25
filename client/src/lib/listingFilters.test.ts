import { describe, expect, it } from "vitest";
import { listingFiltersFromSearch, listingsHref } from "./listingFilters";

describe("filtres du catalogue", () => {
  it("transporte la recherche, la ville et la catégorie depuis l’accueil vers le catalogue", () => {
    const href = listingsHref({ query: "Peugeot 301", city: "Abidjan", category: "vehicules" });
    expect(href).toBe("/annonces?query=Peugeot+301&city=Abidjan&category=vehicules");
    expect(listingFiltersFromSearch(href.split("?")[1])).toEqual({ query: "Peugeot 301", city: "Abidjan", category: "vehicules", condition: "" });
  });

  it("conserve un catalogue sans filtre si aucun critère n’est renseigné", () => {
    expect(listingsHref({ query: "", city: "" })).toBe("/annonces");
  });
});
