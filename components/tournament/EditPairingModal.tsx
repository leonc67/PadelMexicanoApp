"use client";

import { useState } from "react";
import { editMatchPairing } from "@/lib/actions/rounds";
import type { Match, Player } from "@/lib/types";

interface EditPairingModalProps {
  match: Match;
  allMatchesInRound: Match[];
  players: Player[];
  tournamentId: string;
  onClose: () => void;
}

export function EditPairingModal({
  match,
  allMatchesInRound,
  players,
  tournamentId,
  onClose,
}: EditPairingModalProps) {
  // Only the 4 players already on this court
  const courtPlayerIds = new Set([...match.team_a, ...match.team_b]);
  const roundPlayers = players.filter((p) => courtPlayerIds.has(p.id));

  const [a1, setA1] = useState(match.team_a[0]);
  const [a2, setA2] = useState(match.team_a[1]);
  const [b1, setB1] = useState(match.team_b[0]);
  const [b2, setB2] = useState(match.team_b[1]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = [a1, a2, b1, b2];
  const hasDuplicates = new Set(selected).size !== selected.length;

  async function handleSave() {
    if (hasDuplicates) {
      setError("Each player can only appear once");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await editMatchPairing(match.id, [a1, a2], [b1, b2], tournamentId);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update pairing");
    } finally {
      setLoading(false);
    }
  }

  function PlayerSelect({
    value,
    onChange,
    label,
  }: {
    value: string;
    onChange: (v: string) => void;
    label: string;
  }) {
    return (
      <div>
        <label className="block text-xs text-gray-500 mb-1">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {roundPlayers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Edit Pairing — Court {match.court}
        </h2>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Team A</p>
            <div className="space-y-2">
              <PlayerSelect value={a1} onChange={setA1} label="Player 1" />
              <PlayerSelect value={a2} onChange={setA2} label="Player 2" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Team B</p>
            <div className="space-y-2">
              <PlayerSelect value={b1} onChange={setB1} label="Player 1" />
              <PlayerSelect value={b2} onChange={setB2} label="Player 2" />
            </div>
          </div>
        </div>

        {hasDuplicates && (
          <p className="mt-3 text-xs text-red-600">Each player can only appear once</p>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading || hasDuplicates}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving…" : "Save Pairing"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-gray-100 py-2 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
