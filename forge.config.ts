import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { resolve } from "node:path";

const appIconBase = resolve(__dirname, "assets/app-icon/icon");
const appIconIcns = resolve(__dirname, "assets/app-icon/icon.icns");
const appIconIco = resolve(__dirname, "assets/app-icon/icon.ico");
const appIconPng = resolve(__dirname, "assets/app-icon/icon-512.png");

const config: ForgeConfig = {
  packagerConfig: {
    appBundleId: "nl.dutchdronesquad.panevo",
    asar: true,
    icon: appIconBase,
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: "Panevo",
      setupIcon: appIconIco,
    }),
    new MakerDMG({
      name: "Panevo",
      icon: appIconIcns,
      overwrite: true,
    }),
    new MakerRpm({
      options: {
        icon: appIconPng,
      },
    }),
    new MakerDeb({
      options: {
        icon: appIconPng,
      },
    }),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
