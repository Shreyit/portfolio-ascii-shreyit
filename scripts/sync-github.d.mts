export interface FilterPublicRepo {
  name: string;
  private: boolean;
  archived: boolean;
}
export interface FilterPublicResult {
  allowed: FilterPublicRepo[];
  rejected: Array<{ name: string; reason: string }>;
}
export function filterPublic(
  repos: Array<FilterPublicRepo | null>,
): FilterPublicResult;
