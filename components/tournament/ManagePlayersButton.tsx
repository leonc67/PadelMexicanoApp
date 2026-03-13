"use client";

import { useState } from "react";
import { useTournament } from "./TournamentContext";
import { addPlayer, removePlayer, renamePlayer } from "@/lib/actions/tournament";

export function ManagePlayersButton() {
  const { tournament, players } = useTournament();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const courts = Math.max(1, Math.floor(players.length / 4));

  async function handleAdd() {
    if (!newName.trim()) return;
    setError(null);
    setAddLoading(true);
    try {
      await addPlayer(tournament.id, newName.trim());
      setNewName("");
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add player");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRename(playerId: string) {
    if (!editingName.trim()) return;
    setRenamingId(playerId);
    setError(null);
    try {
      await renamePlayer(playerId, editingName.trim(), tournament.id);
      setEditingId(null);
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to rename");
      setRenamingId(null);
    }
  }

  async function handleRemove(playerId: string) {
    setError(null);
    setRemovingId(playerId);
    try {
      await removePlayer(playerId, tournament.id);
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove player");
      setRemovingId(null);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
      >
        Players
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1e3530] border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white">Players</h2>
              <span className="text-xs text-white/40">{players.length} players · {courts} court{courts !== 1 ? "s" : ""}</span>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-white/5 border border-white/10 rounded-xl mb-4">
              {players.map((p) => (
                <div key={p.id} className="px-3 py-2.5">
                  {editingId === p.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(p.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 rounded-lg bg-white/10 border border-white/20 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                      <button
                        onClick={() => handleRename(p.id)}
                        disabled={renamingId === p.id}
                        className="text-xs text-green-400 hover:text-green-300 disabled:opacity-40"
                      >
                        {renamingId === p.id ? "…" : "Save"}
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-white/40 hover:text-white/70">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => { setEditingId(p.id); setEditingName(p.name); }}
                        className="text-sm text-white/80 hover:text-white text-left"
                      >
                        {p.name}
                      </button>
                      <button
                        onClick={() => handleRemove(p.id)}
                        disabled={removingId === p.id}
                        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors"
                      >
                        {removingId === p.id ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text" value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Player name"
                className="flex-1 rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button
                onClick={handleAdd} disabled={addLoading || !newName.trim()}
                className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white font-bold hover:bg-green-400 disabled:opacity-50 transition-colors"
              >
                {addLoading ? "…" : "Add"}
              </button>
            </div>

            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

            <button
              onClick={() => setOpen(false)}
              className="mt-3 w-full rounded-xl bg-white/10 py-2 text-sm text-white/60 hover:bg-white/15 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
