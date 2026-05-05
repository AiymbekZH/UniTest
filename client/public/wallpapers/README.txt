UniTest chat wallpapers
========================

This folder holds the chat background images that the WallpaperPicker
in the app lets users choose from.

How it works
------------
- The picker reads metadata from
    client/src/features/chat/wallpaper/wallpapers.js
  which maps an `id` to a filename under this folder, served at
  `/wallpapers/<filename>`.

- The chat messages container (ChatRoomMessages.jsx) paints the
  selected wallpaper under the bubbles via a semi-transparent overlay
  layer so that orange own-bubbles and slate other-bubbles remain
  readable on any image.

- Users can pick a wallpaper from the InfoDrawer ("Изменить фон"
  button). Choice is persisted in localStorage key
  `unitest_chat_wallpaper` and applied globally to every chat.

Required files
--------------
You need to save the following images into THIS folder (as PNG or
WebP). File names MUST match exactly — wallpapers.js references them.

  1) light-pastel.png
     The cream/beige background with soft pastel orange + gray-blue
     circles, hexagons, and rounded squares. (The wallpaper sample
     you sent earlier.)

  2) dark-academic.png
     The dark navy background with faint academic doodles (π, Σ, √,
     graduation cap, book, light bulb, atom, clipboard). (The other
     wallpaper sample you sent.)

  3) orange-brand.png      (OPTIONAL — skip if you don't want this one)
     The orange tile with the UniTest "U" logo centered.

Tips
----
- File size: aim for <300 KB each. PNG with few colors or WebP both
  work fine. If you exported at 2K the pattern will look crisp on
  retina; you can compress via https://squoosh.app or similar.

- Aspect ratio: doesn't matter. The picker tiles the image by
  default. If you want "cover" mode (no repeat), set `mode: 'cover'`
  on that entry in wallpapers.js.

- Adding more wallpapers later: just drop the file here and add a
  new entry to wallpapers.js — no code changes elsewhere.
