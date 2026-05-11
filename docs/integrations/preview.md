# Preview and Stream Discovery

Panevo no longer includes an in-app video preview implementation in the current roadmap phase. The app should stay focused on reliable camera control, ONVIF discovery/sync, and clean operator workflows.

## Current Decision

The active implementation keeps only ONVIF stream discovery:

- ONVIF probe requests media profiles from the camera.
- ONVIF probe asks the camera for RTSP stream URIs per media profile.
- Discovered RTSP URLs are shown in camera diagnostics.
- RTSP URLs are not played inside Panevo.
- RTSP URLs are not stored as an active preview source.
- NDI preview, native NDI SDK bindings, and renderer playback are out of current scope.

## Why In-App Preview Was Removed

The tested camera exposes RTSP, RTMP, SRT, and NDI, but each option adds meaningful complexity:

- RTSP is not browser-native in Electron and requires a playback backend or gateway.
- RTMP and SRT are transport/distribution protocols, not a simple low-latency renderer target.
- NDI is production-friendly, but a real implementation requires native SDK bindings, runtime packaging, licensing checks, and hardware validation.
- FFmpeg, GStreamer, or helper-process fallback paths would add a second media runtime that Panevo does not need for the control MVP.

For now, Panevo should not carry a half-finished preview stack. External tools such as OBS, NDI Studio Monitor, or camera-native tooling remain the preview path.

## ONVIF Stream Discovery

ONVIF stream discovery remains valuable because it helps operators and future integrations understand what the camera exposes.

Panevo should show:

- RTSP stream count in ONVIF probe summaries.
- Profile name/token for each discovered stream.
- Full RTSP URI in probe diagnostics.

Panevo should not:

- Automatically play the stream.
- Convert RTSP to browser-compatible video.
- Embed credentials into a stored preview URL.
- Couple stream discovery to PTZ control.

## Future Reconsideration

In-app preview can be revisited only after the control and discovery layers are stable.

Future preview work must start with a fresh decision document covering:

- Chosen transport.
- Runtime dependency and packaging plan.
- Licensing implications.
- CPU/load impact during PTZ movement.
- Hardware validation plan.
- Failure behavior when preview crashes or stalls.

Until then, preview remains external and ONVIF RTSP discovery remains diagnostics-only.
