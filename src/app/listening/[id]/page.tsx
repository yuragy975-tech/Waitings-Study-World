import { notFound } from "next/navigation";
import { TrainingClient } from "@/components/TrainingClient";
import { loadMaterial } from "@/lib/listening-server";

export default async function ListeningTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const material = await loadMaterial(id);
  if (!material) notFound();
  return <TrainingClient material={material} />;
}
