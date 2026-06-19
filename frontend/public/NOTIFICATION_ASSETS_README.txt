WAITER NOTIFICATION SOUND — required asset
==========================================

The waiter "Order Ready" popup plays a sound from this folder. The code expects:

    frontend/public/notification.wav

Behavior: the sound LOOPS continuously while any ready-order popup is visible and
stops the moment the waiter closes or serves the last one (no overlap across
multiple pending requests). Implemented in:
    frontend/src/app/core/services/notification-sound.service.ts

NOTE: an earlier revision pointed at /notification.mp4. The current code uses
/notification.wav — drop a short .wav alert tone here. If you prefer .mp4/.mp3,
change the filename in notification-sound.service.ts (the `new Audio('/notification.wav')` line).

This file is just a reminder and can be deleted once notification.wav is added.
