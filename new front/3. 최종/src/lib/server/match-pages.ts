import { callSupabaseRpc } from "@/lib/server/supabase-rpc";

type MatchPageRpc =
  | {
      name: "get_all_matches_by_page";
      args: { p_page: number; p_page_size: number };
    }
  | {
      name: "get_player_matches_by_page";
      args: {
        p_player_name: string;
        p_page: number;
        p_page_size: number;
        p_sort: "time" | "wins" | "losses";
      };
    };

export { SupabaseConfigurationError } from "@/lib/server/supabase-rpc";

export async function callMatchPageRpc({ name, args }: MatchPageRpc): Promise<unknown> {
  return callSupabaseRpc(name, args);
}
