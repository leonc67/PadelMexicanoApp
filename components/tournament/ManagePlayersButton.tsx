"use client";

import { useState } from "react";
import { useTournament } from "./TournamentContext";
import { addPlayer, removePlayer, renamePlayer } from "@/lib/actions/tournament";
import type { Player } from "@/lib/types";

// ------------------------------------------------------------
// Én rad i spillerlisten. Viser enten navnet (med Remove-knapp)
// eller et tekstfelt for å endre navnet. Har ingen egen logikk,
// alt styres av ManagePlayersButton under.
// ------------------------------------------------------------

interface PlayerRowProps {
  player: Player;
  isEditing: boolean; // er navnet i redigeringsmodus?
  editingName: string; // teksten i tekstfeltet
  isRenaming: boolean; // lagrer vi nytt navn akkurat nå?
  isRemoving: boolean; // sletter vi spilleren akkurat nå?
  onStartEdit: () => void;
  onEditingNameChange: (name: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onRemove: () => void;
}

function PlayerRow(props: PlayerRowProps) {
  // Redigeringsmodus: tekstfelt med Save og Cancel.
  if (props.isEditing) {
    return (
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={props.editingName}
            onChange={(e) => props.onEditingNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") props.onSaveEdit();
              if (e.key === "Escape") props.onCancelEdit();
            }}
            className="flex-1 rounded-lg bg-white/10 border border-white/20 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            onClick={props.onSaveEdit}
            disabled={props.isRenaming}
            className="text-xs text-green-400 hover:text-green-300 disabled:opacity-40"
          >
            {props.isRenaming ? "…" : "Save"}
          </button>
          <button onClick={props.onCancelEdit} className="text-xs text-white/40 hover:text-white/70">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Vanlig visning: trykk på navnet for å endre det.
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center justify-between">
        <button
          onClick={props.onStartEdit}
          className="text-sm text-white/80 hover:text-white text-left"
        >
          {props.player.name}
        </button>
        <button
          onClick={props.onRemove}
          disabled={props.isRemoving}
          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors"
        >
          {props.isRemoving ? "Removing…" : "Remove"}
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Knappen "Players" og vinduet som åpnes når man trykker på den
// ------------------------------------------------------------

export function ManagePlayersButton() {
  const { tournament, players } = useTournament();

  // Hver useState er en variabel React følger med på.
  // Når vi kaller for eksempel setOpen(true), tegnes skjermen på nytt.
  const [open, setOpen] = useState(false); // er vinduet åpent?
  const [newName, setNewName] = useState(""); // teksten i feltet for ny spiller
  const [addLoading, setAddLoading] = useState(false); // legger vi til en spiller nå?
  const [removingId, setRemovingId] = useState<string | null>(null); // hvem slettes nå?
  const [renamingId, setRenamingId] = useState<string | null>(null); // hvem får nytt navn nå?
  const [editingId, setEditingId] = useState<string | null>(null); // hvem redigeres nå?
  const [editingName, setEditingName] = useState(""); // teksten i redigeringsfeltet
  const [error, setError] = useState<string | null>(null);

  // Fire spillere per bane, minst én bane.
  const courts = Math.max(1, Math.floor(players.length / 4));

  // Kjører en handling mot serveren. Går det bra, lastes siden på nytt så alle
  // ser endringen. Går det galt, vises feilmeldingen, og onFail() rydder opp.
  async function runAndReload(
    action: () => Promise<void>,
    fallbackMessage: string,
    onFail: () => void
  ) {
    setError(null);
    try {
      await action();
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : fallbackMessage);
      onFail();
    }
  }

  async function handleAdd() {
    if (!newName.trim()) return;

    setAddLoading(true);
    await runAndReload(
      async () => {
        await addPlayer(tournament.id, newName.trim());
        setNewName("");
      },
      "Failed to add player",
      () => {}
    );
    setAddLoading(false);
  }

  async function handleRename(playerId: string) {
    if (!editingName.trim()) return;

    setRenamingId(playerId);
    await runAndReload(
      async () => {
        await renamePlayer(playerId, editingName.trim(), tournament.id);
        setEditingId(null);
      },
      "Failed to rename",
      () => setRenamingId(null)
    );
  }

  async function handleRemove(playerId: string) {
    setRemovingId(playerId);
    await runAndReload(
      async () => {
        await removePlayer(playerId, tournament.id);
      },
      "Failed to remove player",
      () => setRemovingId(null)
    );
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

            {/* Listen med spillere */}
            <div className="overflow-y-auto flex-1 divide-y divide-white/5 border border-white/10 rounded-xl mb-4">
              {players.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  isEditing={editingId === p.id}
                  editingName={editingName}
                  isRenaming={renamingId === p.id}
                  isRemoving={removingId === p.id}
                  onStartEdit={() => {
                    setEditingId(p.id);
                    setEditingName(p.name);
                  }}
                  onEditingNameChange={setEditingName}
                  onSaveEdit={() => handleRename(p.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onRemove={() => handleRemove(p.id)}
                />
              ))}
            </div>

            {/* Legg til ny spiller */}
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
