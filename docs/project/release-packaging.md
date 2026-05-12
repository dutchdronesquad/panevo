# Release and Packaging

Panevo is an Electron Forge desktop application. Development mode is useful for UI and hardware work, but it does not represent the final application identity on macOS or Windows. Production validation must use packaged builds.

## Packaging Goals

Panevo releases should be:

- recognizable as Panevo, not Electron.
- repeatable from documented commands.
- built with platform-appropriate icons and metadata.
- validated on the operating system where the artifact is produced.
- signed and notarized before broader public distribution.

## Development Mode vs Packaged App

`npm start` runs the app through Electron Forge development mode. On macOS this can still surface Electron runtime behavior, icon caching, or an Electron Dock identity. Do not use development mode to judge the final Dock icon, Finder name, installer icon, or Windows taskbar identity.

Use packaged output for identity checks:

```bash
rm -rf out
npm run package
open out/Panevo-darwin-arm64/Panevo.app
```

Packaging can require network access because Electron Forge and Electron Packager may need Electron packaging artifacts.

## Release Workflow

Panevo releases are initiated from GitHub Releases. Publishing a release in GitHub triggers `.github/workflows/release.yaml`.

The workflow:

1. Runs `npm ci`.
2. Derives the application version from the GitHub Release tag.
3. Builds macOS and Windows distributables with `npm run make`.
4. Uploads the generated `.dmg` and `.exe` artifacts from `out/make` back to the published GitHub Release with `softprops/action-gh-release`.

This keeps GitHub Release publishing as the manual release gate. The workflow does not create releases or tags itself. The release tag is the source of truth for the packaged app version. For example, publishing release `v0.1.0` makes the workflow build with package version `0.1.0` even if the committed `package.json` version is still a development placeholder.

Expected release assets:

- One versioned macOS `.dmg` file.
- One versioned Windows setup `.exe` file.

Squirrel update artifacts such as `.nupkg` and `RELEASES` are intentionally not uploaded while Panevo does not have an auto-update strategy.

## Current Forge Strategy

Panevo uses Electron Forge with:

- Vite plugin for main, preload, and renderer builds.
- Electron Packager for platform app bundles.
- Squirrel.Windows maker for Windows installer output.
- DMG maker for macOS installer output.
- RPM and DEB makers for Linux packages.
- Electron fuses for production hardening.

The package identity is configured in `forge.config.ts`:

- `packagerConfig.appBundleId`: macOS bundle identifier.
- `packagerConfig.icon`: base icon path without extension.
- DMG `icon`: macOS installer icon.
- Squirrel `setupIcon`: Windows installer icon.
- DEB/RPM `options.icon`: Linux desktop/package icon.

Runtime desktop identity is configured in `src/main/app`:

- `asset-paths.ts`: shared runtime icon paths.
- `platform.ts`: per-platform app shell decisions.
- `main-window.ts`: `BrowserWindow` creation and runtime window icon.
- `tray.ts`: system tray creation for platforms that keep Panevo running in the background.
- `lifecycle.ts`: app name, App User Model ID, close-to-tray, quit, and activate behavior.

Keep packaging identity and runtime identity aligned. A correct installer icon does not guarantee the taskbar/runtime icon is correct, and a correct runtime icon does not guarantee the installer or app bundle metadata is correct.

## Required Icon Assets

Electron Forge recommends platform-specific icon formats:

- macOS: `.icns`, generated from a 1024x1024 source.
- Windows: `.ico`, exported as a real ICO file, not a renamed PNG.
- Linux: `.png`, typically 512x512.

Panevo keeps app icons in `assets/app-icon`:

- `icon.png`: 1024x1024 padded runtime/source icon.
- `icon.icns`: macOS app bundle icon.
- `icon.ico`: Windows executable/installer icon.
- `icon-512.png`: Linux package icon.
- `icon-256.png`, `icon-128.png`, `icon-64.png`, `icon-32.png`, `icon-16.png`: supporting PNG sizes.

These files should be generated from `assets/brand/panevo-icon-color.png`, with transparent padding so the icon does not appear oversized in macOS Dock and Launchpad contexts.

## macOS Release Requirements

Minimum expected macOS checks:

- `Panevo.app` appears as Panevo in Finder and the Dock.
- `Contents/Info.plist` contains the Panevo bundle name and bundle identifier.
- `Contents/Resources` contains the Panevo `.icns`, not the default Electron icon.
- The Dock icon visually matches macOS safe-area expectations.
- The app runs when launched from the packaged `.app`, not only from `npm start`.

Before a public macOS release, add:

- Apple Developer ID signing.
- Notarization.
- Stapling.
- A documented local signing setup using environment variables or CI secrets.

## Windows Release Requirements

Minimum expected Windows checks:

- The application executable uses the Panevo icon.
- The Squirrel installer uses the Panevo setup icon.
- The installed app appears as Panevo in Start Menu and Apps & Features.
- The taskbar icon is Panevo after install and first launch.
- Closing the main window keeps Panevo running in the system tray.
- The tray menu can reopen Panevo and quit Panevo explicitly.
- The Windows App User Model ID is set to `nl.dutchdronesquad.panevo`.
- Squirrel startup/update/uninstall events are handled by `electron-squirrel-startup`.

Before a public Windows release, add:

- A trusted Authenticode code-signing certificate.
- A decision between Squirrel.Windows, WiX/MSI, or MSIX for the primary public installer.
- Windows App User Model ID validation.

Panevo's Squirrel maker supports optional Windows signing when these environment variables are available during `npm run make`:

- `WINDOWS_CERTIFICATE_FILE`: path to the `.pfx` or `.p12` certificate file.
- `WINDOWS_CERTIFICATE_PASSWORD`: certificate password.

Unsigned builds can still be produced, but Microsoft Defender SmartScreen may warn users because the installer has no trusted publisher reputation. Code signing is required to meaningfully reduce that warning. An EV certificate or established publisher reputation may still be needed before SmartScreen stops warning on fresh releases.

## Linux Release Requirements

Minimum expected Linux checks:

- `.deb` and `.rpm` packages include the Panevo icon.
- Desktop entries use the Panevo name and icon.
- App categories are suitable for a broadcast/video/operator tool.

Linux is not the first validation target for Panevo, but the current Forge makers should remain functional unless packaging complexity becomes a maintenance burden.

## Release Validation Checklist

Run before tagging a release:

- `npm run type`
- `npm run lint`
- `npm run format:check`
- `rm -rf out && npm run package`
- Launch the packaged app on the target OS.
- Confirm icon, app name, menu name, and window title.
- Confirm Windows close-to-tray behavior and tray quit behavior.
- Confirm config storage path still points to the packaged app's `userData`.
- Confirm a fresh userData directory starts with no configured cameras.
- Confirm camera controls still work in packaged mode.
- Confirm ONVIF probing still works in packaged mode.

GitHub release flow:

1. Merge release-ready changes into `main`.
2. Create and publish a GitHub Release with the intended version tag, for example `v0.1.0`.
3. Wait for the Release workflow to attach macOS and Windows artifacts.
4. Download and smoke test the uploaded artifacts on real machines before announcing the release.

## Known Notes

- macOS and Windows cache icons aggressively. A stale Electron icon can be an OS cache issue if the packaged app metadata is correct.
- Development mode is not enough to validate app identity.
- Squirrel `iconUrl` is only useful once Panevo has a hosted HTTPS `.ico` URL for Programs & Features metadata.
- Modern macOS also supports Icon Composer `.icon` files, but Panevo should keep `.icns` as the baseline until the release pipeline explicitly targets newer macOS tooling.

## References

- Electron Forge custom app icon guide: https://www.electronforge.io/guides/create-and-add-icons
- Electron Forge Squirrel.Windows maker: https://www.electronforge.io/config/makers/squirrel.windows
- Electron Packager options: https://electron.github.io/packager/main/interfaces/Options.html
