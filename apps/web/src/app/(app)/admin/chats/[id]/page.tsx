import { AdminChatDetailScreen } from "@/components/screens/admin-chat-detail-screen"

export default async function AdminChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <AdminChatDetailScreen chatId={id} />
}
