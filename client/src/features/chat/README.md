# features/chat

Mobile-first chat shell that replaced `pages/Messages.jsx` in Phase 2.
Mounted at `/chat`, `/chat/:kind/:chatId`. Both DM and group flows
share the same layout — a single shell with `kind: 'dm' | 'group'`
switching per-feature branches downstream.

## Directory map

```
features/chat/
├── ChatLayout.jsx        — top-level shell; owns activeChat, messages,
│                           all modal open-states, keyboard shortcuts,
│                           socket subscription orchestration
├── ChatList/
│   ├── ChatListSidebar.jsx  left column / mobile full-screen list
│   ├── ChatListItem.jsx     single row (DM or group, uniform shape)
│   └── NewChatSheet.jsx     "new chat" bottom sheet
├── ChatRoom/
│   ├── ChatRoomHeader.jsx   avatar + title + search/info buttons
│   ├── ChatRoomMessages.jsx scroll list; drives MediaViewer + album
│   │                        grouping (Phase 4)
│   ├── ChatRoomComposer.jsx textarea + attachments + sticker/voice
│   └── ChatRoomEmpty.jsx    "pick a chat" state
├── components/
│   ├── MessageBubble.jsx    unified bubble (DM + group). Renders
│   │                        text, stickers, images/video, voice,
│   │                        files, forwarded-from banner, reply
│   │                        preview, reactions, action menu,
│   │                        sending/failed status
│   ├── DateSeparator.jsx    "Сегодня / Вчера / DD MMM"
│   ├── ForwardModal.jsx     multi-select target → POST /forward
│   └── GlobalSearchModal.jsx  Cmd+K search across all my chats
├── album/                   — Phase 4 album rendering
│   ├── groupAlbumMessages.js  pure fn: messages[] → render units
│   └── AlbumGrid.jsx          2-10 tile Telegram-style grid
├── mentions/                — Phase 4b-A @mentions
│   ├── MentionAutocomplete.jsx  composer dropdown
│   └── MentionText.jsx          bubble-side @username renderer
├── search/
│   └── InChatSearch.jsx     per-chat search panel (Phase 4b-B)
├── info/
│   └── InfoDrawer.jsx       right-side drawer with Media/Files
│                            tabs, wallpaper button, in-chat search
├── viewer/
│   └── MediaViewer.jsx      pinch-zoom image/video carousel
├── wallpaper/               — Phase 4c chat wallpaper picker
│   ├── wallpapers.js          registry of bundled wallpapers
│   ├── useWallpaper.js        localStorage hook + cross-tab sync
│   └── WallpaperPicker.jsx    grid tile picker modal
└── hooks/
    ├── useChatSocket.js         socket event subscription bag
    ├── useOptimisticMessages.js optimistic-send + ack + retry
    ├── useMediaPager.js         media gallery pagination
    └── useTypingBroadcaster.js  debounced typing:ping emit
```

## Data flow

```
  ChatLayout
      │
      ├─ useChatSocket      → subscribe to dm:* / group:* events
      │                       (message, deleted, pinned, reaction,
      │                       typing, presence, inbox mention)
      │
      ├─ useOptimisticMessages  → sendMessage/editMessage with
      │                            client-side optimistic state +
      │                            ack callback; reconciles server
      │                            copy via clientId echo
      │
      ├─ ChatListSidebar    → /api/dm/conversations + /api/groups/my
      │                       + /api/dm/saved (idempotent)
      │
      ├─ ChatRoomHeader     → derived `header` memo (dm or group)
      │
      ├─ ChatRoomMessages   → groupAlbumMessages pass →
      │   MessageBubble × N   renders singles + albums
      │
      ├─ ChatRoomComposer   → ingest files, detect mentions,
      │                       multi-file serial send for albums
      │
      ├─ InfoDrawer         → media gallery (lazy thumb fetch)
      ├─ GlobalSearchModal  → GET /messages/search
      ├─ ForwardModal       → POST /messages/:id/forward
      ├─ InChatSearch       → GET /{dm|groups}/:id/.../search
      └─ WallpaperPicker    → localStorage only, cross-tab event
```

## Server surface consumed

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/dm/conversations` | list DMs + unread |
| GET | `/api/dm/saved` | get-or-create self-DM (Saved Messages) |
| POST | `/api/dm/conversations` | start DM with user |
| GET | `/api/dm/conversations/:id/messages` | paged history |
| GET | `/api/dm/conversations/:id/media[/:messageId/attachment]` | gallery + lazy thumb |
| GET | `/api/dm/conversations/:id/search?q=` | per-chat search |
| GET | `/api/groups/my` | list my groups |
| GET | `/api/groups/:id/messages` | paged history |
| GET | `/api/groups/:id/media[/:messageId/attachment]` | gallery + lazy thumb |
| GET | `/api/groups/:id/messages/search?q=` | per-chat search |
| GET | `/api/messages/search?q=` | cross-chat search |
| POST | `/api/messages/:id/edit` | edit (≤24 h, own) |
| POST | `/api/messages/:id/forward` | multi-target forward |
| Socket | `dm:message`, `group:message` | send with ack |
| Socket | `dm:read`, `group:read` | mark read |
| Socket | `group:inbox` | unread + mention signal |

## Conventions

- **No custom Router / layout frameworks.** React Router + Tailwind
  only. Modals are AnimatePresence siblings mounted at the layout
  level so they survive chat switches.
- **Optimistic UI first.** Every outgoing message gets a
  `clientId: 'pending-<uuid>'` bubble before the ack. Status icons
  (Clock → Check → CheckCheck → AlertCircle+Retry).
- **Server-strip large fields.** The `/media` list endpoints return
  everything EXCEPT `attachments.data` so a 60-item gallery stays
  small; the attachment blob is fetched per-tile on
  IntersectionObserver in InfoDrawer.
- **No bundled thumbnail generation (yet).** Real thumbnails are the
  full image displayed at thumb size via object-cover. A future
  ChatMessage migration can add a `thumbnail` field and drop this.
- **Module-level caches** (wallpapers, mention usernames, thumbnail
  Blob URLs) are intentional and bounded. They reset on full reload.

## Phase history (for archeology)

- **Phase 0** — surface server errors, ACK + optimistic UI, voice
  preview (VoiceRecorder preview-then-send).
- **Phase 1** — backend foundation: search / forward / edit /
  gallery endpoints, unified ChatMessage schema + migration script
  (not yet run on prod — DMMessage + Message remain the write
  path).
- **Phase 2** — this shell. `/chat` became canonical; `/messages`
  became a redirect.
- **Phase 3** — stickers + voice preview + pinch-zoom MediaViewer.
  AI sticker generation later removed.
- **Phase 4 / 4b** — edit + forward + global search + media gallery
  + drag&drop albums + album bubble grid + @mentions with
  autocomplete, bubble rendering, and mention toasts + per-chat
  search + real lazy thumbnails + Saved Messages.

## Known deferred work (Phase 5+)

- Write-path migration from `DMMessage` / `Message` → `ChatMessage`.
  Schema exists, migration script exists; nothing writes to the
  unified collection yet.
- `pages/Groups.jsx` still hosts an inline chat view using the
  legacy `components/chat/MessageList.jsx` + `ChatInput.jsx`. The
  plan calls for splitting it into `/groups/:id/settings` (keep
  the group management UI) + redirect its chat button to
  `/chat/group/:id`. Not done — the file is 1 800 lines of
  coupled settings/arena/role state.
- Server-side thumbnail JPEGs for the media gallery (currently
  serves full-resolution blobs scaled by CSS).
- DM @mentions — schema supports it, socket/dm.js doesn't extract.
- Mention audio cue (separate chime from regular inbox sound).
