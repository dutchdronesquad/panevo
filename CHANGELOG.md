# Changelog

All notable shipped changes to Panevo should be documented in this file.

This changelog is intentionally concise. GitHub Releases and Release Drafter can continue to carry the fuller change list.

## [0.2.0]

### PTZ MVP and camera operations

Panevo now has a complete PTZ control MVP for live production use. Operators can configure camera profiles, select an active camera, control pan, tilt, zoom, focus, stop, emergency stop, and recall or store presets through the desktop app. The tested Tenveo workflow uses VISCA over UDP for responsive live control, with safety behavior for pointer release, app blur, visibility loss, speed clamps, command queueing, and active-camera validation.

### ONVIF discovery and preset sync

Camera profiles can now use ONVIF for discovery, metadata, capability probing, stream URI diagnostics, and numeric preset import or synchronization. ONVIF remains isolated behind main-process services, while VISCA stays the default live control route for the tested Tenveo setup. RTSP stream URLs are shown as diagnostics only; Panevo does not include in-app video preview yet.

### Integrations and automation foundation

Panevo now includes integration management, OBS websocket scene switching, RotorHazard race-state monitoring, configurable keyboard shortcuts, and standard gamepad/joystick-style control-device mapping. Core automation has a constrained `When / If / Then` builder with local rule persistence, RotorHazard race-event triggers, ordered actions, enable/disable controls, and last-result feedback.
