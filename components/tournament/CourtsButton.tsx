"use client";

import { useState } from "react";
import { useTournament } from "./TournamentContext";
import { renameCourts } from "@/lib/actions/tournament";
import { MAX_COURT_NAME_LENGTH } from "@/lib/courts";

// Knappen "Courts" i toppmenyen, og vinduet der man gir banene egne navn.
export function CourtsButton() {
  const { tournament } = useTournament();

  const [open, setOpen] = useState(false); // er vinduet åpent?
  const [names, setNames] = useState<string[]>([]); // teksten i hvert felt, ett per bane
  const [saving, setSaving] = useState(false); // lagrer vi akkurat nå?
  const [error, setError] = useState<string | null>(null);

  // Åpner vinduet og fyller feltene med navnene som er lagret fra før.
  function openWindow() {
    const savedNames = tournament.court_names ?? [];
    const startNames: string[] = [];
    for (let i = 0; i < tournament.num_courts; i++) {
      startNames.push(savedNames[i] ?? "");
    }

    setNames(startNames);
    setError(null);
    setOpen(true);
  }

  // Kalles når man skriver i feltet for én bane.
  function changeName(index: number, newName: string) {
    const updated = [...names]; // lag en kopi, React vil ha en ny liste
    updated[index] = newName;
    setNames(updated);
  }

  // Lagrer alle navnene og laster siden på nytt, så de vises overalt.
  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await renameCourts(tournament.id, names);
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save court names");
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={openWindow}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
      >
        Courts
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1e3530] border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 max-h-[80vh] flex flex-col">
            <h2 className="text-lg font-black text-white mb-1">Courts</h2>
            <p className="text-xs text-white/40 mb-4">Leave a field empty to use the default name.</p>

            {/* Ett tekstfelt per bane */}
            <div className="overflow-y-auto flex-1 space-y-3 mb-4">
              {names.map((name, index) => (
                <div key={index}>
                  <label className="block text-xs text-white/50 mb-1">Court {index + 1}</label>
                  <input
                    type="text"
                    value={name}
                    maxLength={MAX_COURT_NAME_LENGTH}
                    placeholder={"Court " + (index + 1)}
                    onChange={(e) => changeName(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                    }}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              ))}
            </div>

            {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-green-500 py-2 text-sm text-white font-bold hover:bg-green-400 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl bg-white/10 py-2 text-sm text-white/60 hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
