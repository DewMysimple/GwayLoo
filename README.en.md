# GwayLoo

[简体中文](./README.md) · English

GwayLoo is an immersive watercolor experience built with React, TypeScript, and React Three Fiber. It combines continuous scrolling, poetry, watercolor layers, six landscape video scenes, sound, and the closing page content into a web experience designed for gradual maintenance and creative iteration.

[View the GitHub repository](https://github.com/DewMysimple/GwayLoo)

> Current status: the project is still in development. The legacy runtime remains the default, while the R3F runtime is available through a query parameter for visual and interaction regression.

## Overview

The current experience includes:

- A continuous-scroll immersive entry point;
- Poetry, watercolor layers, paper, and ground visuals;
- Six desktop/mobile landscape videos with base/over compositing;
- Sound controls unlocked by user interaction;
- Back, Restart, Benefits, FAQ, and closing experience content;
- Switchable legacy and React Three Fiber runtimes.

The project does not provide accounts, commerce, payments, a subscription backend, a CMS, WordPress services, or independent routes. Subscription, gifting, email, and award copy are static experience content.

## Runtime modes

| Mode | URL | Purpose |
| --- | --- | --- |
| legacy | `http://localhost:5173/` | Default compatibility baseline and primary experience |
| legacy (explicit) | `http://localhost:5173/?runtime=legacy` | Explicitly select the compatibility runtime |
| R3F | `http://localhost:5173/?runtime=r3f` | Preview the modular React Three Fiber runtime |

The R3F runtime already includes unified state, loaders, video landscapes, sound, scrolling, and closing-page behavior. Its watercolor shading, paper noise, SDF masking, ground layers, and post-processing are not yet frame-for-frame equivalent to the reference experience. The legacy runtime therefore remains the default and the fallback during migration.

## Quick start

Use Node.js 20.19 or newer and npm:

```bash
npm install
npm run dev
```

The development server normally runs at `http://localhost:5173`. Build and preview the production output with:

```bash
npm run build
npm run preview
```

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run check:assets
npm run build
npm run test:e2e
```

By default, Playwright verifies the current repository only. Maintainers with access to a private reference fixture can set `GWAYLOO_REFERENCE_ROOT` to enable the optional reference-site geometry comparison; a normal GitHub clone does not require any machine-specific directory.

## Project structure

```text
src/
├── app/                              # React application entry and loaders
├── content/                          # Copy, scenes, assets, and experience config
├── features/experience/
│   ├── runtime/                      # Runtime contract, state, input, audio, performance
│   ├── r3f/                          # React Three Fiber scene and asset pipeline
│   ├── LegacyRuntimeBridge.tsx       # Sole React entry for the legacy engine
│   └── OriginalExperienceTail.tsx    # Closing page content
├── styles/                           # Global styles and design tokens
└── test/                             # Vitest setup

tests/e2e/                            # Playwright desktop/mobile regression tests
public/wp-content/themes/davidwhyte/  # Compatibility runtime assets kept during migration
blender_scenebench/                   # Isolated Blender scene workbench
docs/                                 # Execution and maintenance documentation
```

`ExperienceDefinition` and `sceneManifest` are the main configuration entries for the new runtime. Compatibility assets under `public/` are still used by legacy, while R3F reads the web assets through typed resource definitions.

## Blender scene workbench

[`blender_scenebench/`](./blender_scenebench/) is an isolated Blender 5.0 scene workbench. Vite, `src/`, and the production web runtime do not load assets from this directory; it is used for scene reconstruction, editable art assets, version preparation, and validation.

Current delivered versions:

- Full baseline: `blender_scenebench/blender/GwayLoo_Scene_5_0.blend`
- Non-camera-animation-free version: `blender_scenebench/versions/no-animation/blender/GwayLoo_Scene_5_0_no_animation.blend`

The scene contains 26 editable watercolor layers, camera animation, desktop/mobile landscape entries, and a centralized derivative-version layout. The `no-animation` version freezes non-camera state at frame 3586 while preserving camera animation.

Blender build, asset, versioning, and validation commands are documented in [`blender_scenebench/README.md`](./blender_scenebench/README.md).

## Development plan

The dual-runtime migration, asset pipeline, interaction regression, and legacy cleanup gates are documented in [`docs/EXECUTION_PLAN.md`](./docs/EXECUTION_PLAN.md). The legacy engine, compatibility DOM, and `/wp-content/` paths will remain until the R3F runtime passes the complete visual and interaction review.

## Usage and copyright boundaries

- The repository currently does not declare a unified open-source license. Do not assume that the code, media, fonts, models, audio, or text may be redistributed without explicit permission.
- Some assets and the legacy runtime are retained for local technical research and compatibility verification. Public release still requires brand replacement, asset licensing, and external-link review.
- This project does not claim redistribution rights for the original experience materials or third-party resources.

## Project status note

The web code and Blender workbench share one Git project, but the Blender workbench is not a web runtime dependency. Generated caches, source snapshots, and local test outputs follow their respective `.gitignore` rules; deliverable source, configuration, documentation, and version files remain in the repository.
