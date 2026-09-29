"use client";

import { useState } from "react";
import { submitScore } from "@/lib/actions/scores";
import { useTournament } from "./TournamentContext";
import type { Match, Player } from "@/lib/types";

interface MatchCardProps {
  match: Match;
  players: Player[];
  tournamentId: string;
  onEditPairing: (match: Match) => void;
}

// Finner navnet til en spiller ut fra id-en.
function getPlayerName(id: string, players: Player[]) {
  for (const player of players) {
    if (player.id === id) {
      return player.name;
    }
  }
  return "Unknown";
}

// ------------------------------------------------------------
// Små deler som tegner banen. De har ingen logikk, bare utseende.
// ------------------------------------------------------------

// Linjene på padelbanen (ytterkant, servelinjer og nettet i midten).
function CourtLines() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-3 border border-white/50 rounded-sm" />
      <div className="absolute left-3 right-3 h-px bg-white/40" style={{ top: "33%" }} />
      <div className="absolute left-3 right-3 h-px bg-white/40" style={{ bottom: "33%" }} />
      <div className="absolute top-3 bottom-3 w-px bg-white/30" style={{ left: "22%" }} />
      <div className="absolute top-3 bottom-3 w-px bg-white/30" style={{ right: "22%" }} />
      <div
        className="absolute top-0 bottom-0 w-[3px] bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.5)]"
        style={{ left: "50%" }}
      />
    </div>
  );
}

// Ett spillernavn i et hjørne av banen.
// "position" sier hvor (for eksempel { left: "3%", top: "3%" } er oppe til venstre).
function PlayerName({ name, position }: { name: string; position: React.CSSProperties }) {
  const style = { ...position, width: "19%", height: "30%" };

  return (
    <div className="absolute flex items-center justify-center text-center" style={style}>
      <span className="text-white font-bold text-base leading-tight drop-shadow-md">{name}</span>
    </div>
  );
}

// Knappen som viser poengene til ett lag. Trykk på den for å velge poeng.
function ScoreButton({
  left,
  score,
  isPicking,
  loading,
  onClick,
}: {
  left: string; // hvor langt fra venstre kanten boksen starter ("22%" eller "50%")
  score: number | null;
  isPicking: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  let colorClass = "bg-gray-900/90 hover:bg-gray-800";
  if (isPicking) {
    colorClass = "bg-white/30 ring-2 ring-white/60";
  }

  let text = "0";
  if (loading) {
    text = "…";
  } else if (score !== null) {
    text = String(score);
  }

  return (
    <div
      className="absolute flex items-center justify-center"
      style={{ left: left, top: "33%", width: "28%", height: "34%" }}
    >
      <button
        onClick={onClick}
        disabled={loading}
        className={`w-14 h-12 rounded-xl font-bold text-2xl text-white shadow-xl transition-colors ${colorClass}`}
      >
        {text}
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// Selve kampkortet
// ------------------------------------------------------------

export function MatchCard({ match, players, tournamentId, onEditPairing }: MatchCardProps) {
  const { tournament } = useTournament();

  // Lagenes poeng skal alltid summere til dette tallet.
  const TOTAL = tournament.max_points;

  // Tallene 0, 1, 2 ... TOTAL som man kan velge mellom.
  const SCORES: number[] = [];
  for (let n = 0; n <= TOTAL; n++) {
    SCORES.push(n);
  }

  const [scoreA, setScoreA] = useState<number | null>(match.score_a ?? null);
  const [scoreB, setScoreB] = useState<number | null>(match.score_b ?? null);
  const [picker, setPicker] = useState<"a" | "b" | null>(null); // hvilket lag velger poeng nå?
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teamANames = match.team_a.map((id) => getPlayerName(id, players));
  const teamBNames = match.team_b.map((id) => getPlayerName(id, players));

  // Kalles når man trykker på et tall. Laget som velger får tallet,
  // det andre laget får resten (slik at summen blir TOTAL).
  async function selectScore(n: number) {
    const a = picker === "a" ? n : TOTAL - n;
    const b = picker === "b" ? n : TOTAL - n;

    setScoreA(a);
    setScoreB(b);
    setPicker(null);
    setError(null);
    setLoading(true);

    try {
      await submitScore(match.id, a, b, tournamentId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  // Trykk på samme lag igjen for å lukke tallvelgeren.
  function togglePicker(team: "a" | "b") {
    if (picker === team) {
      setPicker(null);
    } else {
      setPicker(team);
    }
  }

  return (
    <div
      className="rounded-3xl overflow-hidden shadow-2xl"
      style={{ background: "linear-gradient(145deg, #1a2a4e, #0d1830)", padding: "8px" }}
    >
      {/* Banen */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #2e5fd4 0%, #3b6be0 50%, #2e5fd4 100%)",
          height: "200px",
        }}
      >
        <CourtLines />

        {/* Banenummer */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
          <span className="bg-gray-900 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
            Court {match.court}
          </span>
        </div>

        {/* Lag A står til venstre, lag B til høyre */}
        <PlayerName name={teamANames[0]} position={{ left: "3%", top: "3%" }} />
        <PlayerName name={teamANames[1]} position={{ left: "3%", bottom: "3%" }} />
        <PlayerName name={teamBNames[0]} position={{ right: "3%", top: "3%" }} />
        <PlayerName name={teamBNames[1]} position={{ right: "3%", bottom: "3%" }} />

        {/* Poengknappene i midten */}
        <ScoreButton
          left="22%"
          score={scoreA}
          isPicking={picker === "a"}
          loading={loading}
          onClick={() => togglePicker("a")}
        />
        <ScoreButton
          left="50%"
          score={scoreB}
          isPicking={picker === "b"}
          loading={loading}
          onClick={() => togglePicker("b")}
        />
      </div>

      {/* Tallvelger, vises når man har trykket på en poengknapp */}
      {picker && (
        <div className="mt-2 grid grid-cols-5 gap-1.5 px-1 pb-1">
          {SCORES.map((n) => (
            <button
              key={n}
              onClick={() => selectScore(n)}
              className="rounded-xl border border-white/20 py-2 text-sm font-bold text-white hover:bg-white/20 active:bg-white/30 transition-colors"
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {error && <p className="px-2 pb-1 text-xs text-red-400">{error}</p>}

      <div className="flex justify-end px-2 pb-1 pt-0.5">
        <button
          onClick={() => onEditPairing(match)}
          className="text-xs text-white/30 hover:text-white/70 transition-colors"
        >
          Edit Pairing
        </button>
      </div>
    </div>
  );
}
