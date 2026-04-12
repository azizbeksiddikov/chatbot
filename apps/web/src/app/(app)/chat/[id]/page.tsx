import { AiChatScreen } from "@/components/screens/ai-chat-screen"

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <AiChatScreen chatId={id} />
}
