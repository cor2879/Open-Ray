# Open-Ray

Linux-first Blu-ray/UHD authoring software, developed around an independent filmmaker's workflow. First production use case: The Lion of God collector’s edition.

## Current status

Foundation only. Open-Ray validates project manifests, inspects media with ffprobe, checks chapter bounds, and reports external tool availability. It does **not** yet encode, author menus, build disc folders or ISOs, or certify Blu-ray/UHD compliance.

## Run

Node.js 24 or newer. No npm dependencies or compilation step: Node runs the erasable TypeScript directly.

```sh
npm test
npm start -- --help
npm start -- doctor
npm start -- validate examples/lion-of-god.openray.json
npm start -- inspect /path/to/clip.mov
npm start -- preflight examples/lion-of-god.openray.json
```

Install ffprobe/FFmpeg separately for media inspection. `doctor` also checks for `tsMuxeR` on PATH; the backend has not yet been selected or qualified. Missing dependencies and failed checks return a nonzero exit code. Inspection uses argument arrays, not shell command strings.

## Project format v1

See `examples/lion-of-god.openray.json`. Source paths are relative to the project file. Chapters are strictly increasing times in seconds. Profiles are `uhd-experimental` and `bluray-hd`; they record intent, not conformance. Keep masters outside Git. The example intentionally references a local clip that is not supplied.

## Roadmap

1. Foundation: manifests, inspection, dependency checks.
2. Playback proof: choose/pin backend; encode or accept a validated short 4K asset; generate disc folder and ISO; verify on actual hardware.
3. Multiple titles, subtitle conversion, alternate cuts, extras, capacity planning.
4. Remote-controlled disc menus and chapter selection.
5. Desktop editor, build progress, validation reports.

Separate acceptance gates: generated image; playback on named player/firmware/media; commercial replication acceptance. A burned UHD experiment is not automatically a replication-ready master. Preserve SDR/HDR characteristics; never label an SDR source HDR just because it is 4K.

## First hardware test record

Record player model/firmware, burner, media type, backend version, source properties, image checksum, and playback/seek/audio results. Until this test passes, compatibility remains unverified.

## Technical references

- https://github.com/justdan96/tsMuxer/blob/master/docs/USAGE.md — UHD muxing/ISO options; original upstream is archived.
- https://blu-raydisc.info/format-spec/rom4-spec.php — UHD format overview.
- https://blu-raydisc.info/authoring-faq.php — commercial verification context.

Project licensing is to be selected by the repository owner. No third-party binaries are bundled.
