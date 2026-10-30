import type { Tournament } from "@/lib/types";

// Hvor lange banenavn kan være. Lengre navn får ikke plass på banen i kampkortet.
export const MAX_COURT_NAME_LENGTH = 20;

// Gir navnet på en bane. Bane-nummeret starter på 1.
// Har banen fått et eget navn, brukes det. Ellers heter den "Court 1", "Court 2" osv.
export function getCourtName(tournament: Tournament, court: number): string {
  // Listen kan mangle hvis databasen ikke har kolonnen ennå.
  const names = tournament.court_names ?? [];

  // Bane 1 ligger på plass 0 i listen, bane 2 på plass 1 osv.
  const name = names[court - 1];

  if (name !== undefined && name.trim() !== "") {
    return name;
  }
  return "Court " + court;
}
