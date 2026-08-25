import { useQuery } from "@tanstack/react-query";
import { isSupabaseMode } from "./backendMode";
import { searchPortableListings, type PortableListingFilters } from "./marketplaceSupabase";
import { trpc } from "./trpc";

export function usePublicListings(filters: PortableListingFilters) {
  const legacy = trpc.marketplace.listings.search.useQuery(filters, { enabled: !isSupabaseMode });
  const portable = useQuery({
    queryKey: ["portable-public-listings", filters],
    queryFn: () => searchPortableListings(filters),
    enabled: isSupabaseMode,
  });
  return isSupabaseMode ? portable : legacy;
}
