import { useEffect, useRef, useState, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import MediaViewerModal from './MediaViewerModal';
import { Loader2 } from 'lucide-react';

export default function MessageList({
  messages, currentUserId, onReply, onDelete, onPin,
  getDeleteOptions, canPin, onLoadMore, hasMore, loading,
  getMemberRoleColor, otherUserId,
}) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevLenRef = useRef(0);
  const [mediaViewer, setMediaViewer] = useState(null);

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
      {messages.map((msg) => {
        const isOwn = msg.sender?._id === currentUserId;
        const isReadByOther = isOwn && otherUserId && Array.isArray(msg.readBy) && msg.readBy.some(id => String(id?._id || id) === String(otherUserId));
        return (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={isOwn}
            onReply={onReply}
            onDelete={onDelete}
            onPin={onPin}
            deleteOptions={getDeleteOptions?.(msg, isOwn)}
            canPin={canPin}
            roleColor={getMemberRoleColor?.(msg.sender?._id)}
            onPreviewMedia={setMediaViewer}
            isReadByOther={isReadByOther}
          />
        );
      })}
      <div ref={bottomRef} />
      <MediaViewerModal media={mediaViewer} onClose={() => setMediaViewer(null)} />
    </div>
  );
}
