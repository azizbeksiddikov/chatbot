import { AdminProjectDetailScreen } from "@/components/screens/admin-project-detail-screen"

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <AdminProjectDetailScreen projectId={id} />
}
