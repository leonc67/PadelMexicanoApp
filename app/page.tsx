import { TournamentSetupForm } from "@/components/tournament/TournamentSetupForm";

const envMissing =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function Home() {
  if (envMissing) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border border-yellow-500/40 bg-yellow-900/30 p-8 text-center">
          <h1 className="text-2xl font-bold text-yellow-300 mb-4">Setup Required</h1>
          <p className="text-yellow-200/80 mb-6">Supabase environment variables are missing.</p>
          <ol className="text-left text-sm text-yellow-200/70 space-y-2">
            <li>1. Create a free account at <strong>supabase.com</strong></li>
            <li>2. Copy <code className="bg-white/10 px-1 rounded">.env.local.example</code> → <code className="bg-white/10 px-1 rounded">.env.local</code></li>
            <li>3. Run <code className="bg-white/10 px-1 rounded">supabase/schema.sql</code> in SQL Editor</li>
            <li>4. Restart dev server</li>
          </ol>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎾</div>
          <h1 className="text-4xl font-black text-white mb-2">Padel Mexicano</h1>
          <p className="text-white/60">Create a tournament and start playing</p>
        </div>
        <div className="bg-[#1e3530] rounded-2xl shadow-2xl border border-white/10 p-8">
          <TournamentSetupForm />
        </div>
      </div>
    </main>
  );
}
