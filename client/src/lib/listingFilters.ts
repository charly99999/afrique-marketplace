export type ListingFilters = { query: string; category: string; city: string; condition: string };

export const emptyListingFilters: ListingFilters = { query: "", category: "", city: "", condition: "" };

export function listingFiltersFromSearch(search: string): ListingFilters {
  const parameters = new URLSearchParams(search);
  return {
    query: parameters.get("query") ?? "",
    category: parameters.get("category") ?? "",
    city: parameters.get("city") ?? "",
    condition: parameters.get("condition") ?? "",
  };
}

export function listingsHref(filters: Partial<ListingFilters>) {
  const parameters = new URLSearchParams();
  (Object.entries(filters) as Array<[keyof ListingFilters, string | undefined]>).forEach(([key, value]) => {
    if (value?.trim()) parameters.set(key, value.trim());
  });
  const search = parameters.toString();
  return search ? `/annonces?${search}` : "/annonces";
}
