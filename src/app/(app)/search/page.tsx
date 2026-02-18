import { requireAuth } from "@/lib/auth-helpers";
import { SearchClient } from "./search-client";

export default async function SearchPage() {
  await requireAuth();
  return <SearchClient />;
}
