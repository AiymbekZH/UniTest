import { useMemo } from 'react';

// Builds the various share URLs for a test. Kept as a thin hook so the
// LaunchPanel / ShareSheet don't each recompute the same strings, and
// so swapping the URL scheme later (e.g. ?ref=share tracking) is a
// single-file change.
//
// `shareLink` is the 8-char uuid slice stored on the Test document.

export function useShareLink(shareLink) {
  return useMemo(() => {
    if (!shareLink || typeof window === 'undefined') {
      return { profile: '', direct: '', telegram: '', whatsapp: '', qr: '' };
    }

    const origin = window.location.origin;
    const profile = `${origin}/test-profile/${shareLink}`;
    const direct = `${origin}/test/${shareLink}`;

    // Share URLs. Telegram's share URL takes `url` + optional `text`;
    // WhatsApp takes a single `text` with the URL embedded. Both open
    // a chat-picker modal on click.
    const encoded = encodeURIComponent(profile);
    const telegram = `https://t.me/share/url?url=${encoded}`;
    const whatsapp = `https://wa.me/?text=${encoded}`;

    // QR: external qrserver endpoint. See TestProfilePage plan doc for
    // why we don't bundle a client-side QR generator.
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;

    return { profile, direct, telegram, whatsapp, qr };
  }, [shareLink]);
}
