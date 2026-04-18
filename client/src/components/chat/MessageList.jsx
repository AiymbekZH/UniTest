import { useEffect, useRef, useState, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import { Loader2 } from 'lucide-react';

export default function MessageList({
  messages, currentUserId, onReply, onDelete, onPin,
  canDelete, canPin, onLoadMore, hasMore, loading,
  getMemberRoleColor,
}) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevLenRef = useRef(0);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && messages.length > prevLenRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: messages.length - prevLenRef.current > 5 ? 'auto' : 'smooth' });
    }
    prevLenRef.current = messages.length;
  }, [messages.length, autoScroll]);

  // Initial scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  // Scroll detection for load-more and auto-scroll
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(atBottom);

    // Load more when scrolled to top
    if (el.scrollTop < 80 && hasMore && !loading) {
      const prevHeight = el.scrollHeight;
      onLoadMore?.().then(() => {
        // Maintain scroll position after prepending messages
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevHeight;
        });
      });
    }
  }, [hasMore, loading, onLoadMore]);

  return (
    <div ref={containerRef} onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5 custom-scrollbar">
      {loading && (
        <div className="flex justify-center py-3">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      )}
      {!hasMore && messages.length > 0 && (
        <div className="text-center py-3">
          <span className="text-[11px] text-gray-400">Начало истории</span>
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble
          key={msg._id}
          message={msg}
          isOwn={msg.sender?._id === currentUserId}
          onReply={onReply}
          onDelete={onDelete}
          onPin={onPin}
          canDelete={canDelete}
          canPin={canPin}
          roleColor={getMemberRoleColor?.(msg.sender?._id)}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
