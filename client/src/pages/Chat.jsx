import ChatLayout from '../features/chat/ChatLayout';

/**
 * Thin route entry. The work happens in features/chat/ChatLayout.
 * Kept as its own file so the lazy-loaded chunk can be code-split
 * exactly at the chat-feature boundary.
 */
export default function Chat() {
  return <ChatLayout />;
}
