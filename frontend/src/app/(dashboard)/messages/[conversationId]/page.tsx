export const instant = false;

import ConversationChat from "./conversation-chat";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <ConversationChat key={conversationId} conversationId={conversationId} />;
}
