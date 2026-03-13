export interface Tournament {
  id: string;
  name: string;
  num_courts: number;
  max_points: number;
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
