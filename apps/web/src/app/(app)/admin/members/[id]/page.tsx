import { AdminMemberDetailScreen } from "@/components/screens/admin-member-detail-screen"

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <AdminMemberDetailScreen memberId={id} />
}
