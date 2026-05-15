<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/panevo-logo-color-darkbg.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/brand/panevo-logo-color-lightbg.svg">
    <img alt="Panevo" src="assets/brand/panevo-logo-color-lightbg.svg" width="320">
  </picture>
</p>

<p align="center">
  <strong>Live production control for PTZ cameras and race broadcast operators.</strong>
</p>

<p align="center">
  <a href="https://github.com/dutchdronesquad/panevo/actions/workflows/linting.yaml"><img
    src="https://github.com/dutchdronesquad/panevo/actions/workflows/linting.yaml/badge.svg"
    alt="Linting"
  /></a>
  <a href="LICENSE"><img
    src="https://img.shields.io/badge/license-MIT-blue"
    alt="License"
  /></a>
</p>

<p align="center">
  <a href="docs/index.md"><strong>Docs</strong></a>
  &middot;
  <a href="docs/product/roadmap.md"><strong>Roadmap</strong></a>
  &middot;
  <a href="docs/hardware/tenveo-hardware.md"><strong>Hardware notes</strong></a>
</p>

<p align="center">
  Panevo is a desktop control surface for livestream operators who need fast,
  reliable PTZ camera control during live events.
</p>

> Product screenshots will be added after the first public visual QA pass.

## Project status

Panevo is in early active development. The PTZ control MVP is functional and has been tested with a Tenveo PTZ camera.

Current focus:

- Reliable PTZ operation
- Camera profiles
- VISCA live control
- ONVIF discovery and preset sync
- Optional OBS scene control
- Configurable operator shortcuts
- Physical operator input validation

Video preview is intentionally handled outside Panevo for now.

## What you can do

- 🎥 **Control PTZ cameras live** - use operator-focused controls for pan, tilt, zoom, focus, stop, and emergency stop
- 🎛️ **Manage camera profiles** - configure and switch between multiple cameras from one desktop app
- 📍 **Recall and store presets** - keep a local named preset list mapped to camera preset numbers
- 🔎 **Probe cameras with ONVIF** - discover camera metadata, media profiles, RTSP stream URIs, and numeric presets where supported
- ⚡ **Use VISCA for responsive movement** - keep VISCA as the default live control route for the tested Tenveo workflow
- 🎬 **Switch OBS scenes** - connect to OBS websocket, show the active scene, and switch scenes from the Control view
- ⌨️ **Configure operator shortcuts** - use foreground PTZ/zoom shortcuts in Control and global preset shortcuts while Panevo runs in the background

## Tested hardware

Panevo has been validated with a Tenveo PTZ camera.

- VISCA over IP using UDP
- VISCA port `52381`
- ONVIF port `8080`
- Pan speed range `1-24`
- Tilt speed range `1-24`
- Zoom speed range `1-8`

Hardware validation notes live in [`docs/hardware/tenveo-hardware.md`](docs/hardware/tenveo-hardware.md).

## How it works

1. **Add a camera profile** with the camera IP address and protocol settings.
2. **Probe ONVIF when available** to discover metadata, stream URIs, media profiles, and numeric presets.
3. **Select the active camera** before moving or recalling shots.
4. **Operate the camera live** with PTZ, zoom, focus, stop, and preset controls.
5. **Configure integrations and shortcuts** when you want OBS scene switching or keyboard-based operator controls.
6. **Keep preview external** through OBS, NDI Studio Monitor, camera-native tools, or another confidence monitor.

## Useful links

- [`docs/product/roadmap.md`](docs/product/roadmap.md)
- [`docs/product/mvp-checklist.md`](docs/product/mvp-checklist.md)
- [`docs/integrations/integration-use-cases.md`](docs/integrations/integration-use-cases.md)

## Sponsors

If Panevo helps your club, event, or race-day workflow, you can help fund continued development and maintenance.

- Support the project through [GitHub Sponsors](https://github.com/sponsors/klaasnicolaas)
- Send a one-off contribution through [Ko-fi](https://ko-fi.com/klaasnicolaas)

## Contributing

You are welcome to contribute to Panevo. You can find a guide on how to contribute in [CONTRIBUTING.md](CONTRIBUTING.md).

<a href="https://github.com/dutchdronesquad/panevo/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=dutchdronesquad/panevo" alt="Contributors" />
</a>

## License

Distributed under the **MIT** License - see [LICENSE](LICENSE) for details.
