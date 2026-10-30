export interface Tournament {
  id: string;
  name: string;
  num_courts: number;
  max_points: number;
  // Egne navn på banene. court_names[0] er bane 1, court_names[1] er bane 2 osv.
  // Tom tekst eller manglende navn betyr at banen bare heter "Court 1", "Court 2" osv.
  court_names?: string[] | null;
  created_at: string;
}

export interface Player {
  id: string;
  tournament_id: string;
  name: string;
  created_at: string;
}

export interface Round {
  id: string;
  tournament_id: string;
  round_number: number;
  created_at: string;
}

export interface Match {
  id: string;
  round_id: string;
  court: number;
  team_a: string[];
  team_b: string[];
  score_a: number | null;
  score_b: number | null;
  created_at: string;
}
