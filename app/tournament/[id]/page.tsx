import { redirect } from "next/navigation";

export default function TournamentPage({ params }: { params: { id: string } }) {
  redirect(`/tournament/${params.id}/rounds`);
}
