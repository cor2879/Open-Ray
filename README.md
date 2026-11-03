# Open-Ray

Linux-first Blu-ray/UHD authoring software, developed around an independent filmmaker's workflow. First production use case: The Lion of God collector’s edition.

## Current status

Experimental single-title UHD build pipeline. Open-Ray validates manifests, inspects media, extracts HEVC/AC-3 streams without re-encoding, writes tsMuxer metadata, and invokes an external backend for disc-folder or ISO output. It does **not** encode, author menus, or certify Blu-ray/UHD compliance. Actual backend output and hardware playback remain unverified in the development environment.

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

## Experimental build

Install tsMuxer separately. The prototype adapter follows the original upstream's documented `--blu-ray-v3` interface; start qualification with upstream release 2.7.0. This is a candidate backend, not a qualified or bundled dependency. Set `OPEN_RAY_TSMUXER` to an executable path if it is not called `tsMuxeR` on PATH.

```sh
npm start -- build project.openray.json output-test iso
npm start -- build project.openray.json output-folder folder
OPEN_RAY_INTEGRATION=1 npm test
```

The output directory must not exist, and its parent must exist. The current input contract is deliberately narrow: one UHD title, 3840×2160 HEVC 10-bit 4:2:0, matching nominal/average frame rates (23.976, 24, 25, 29.97, or 30), and one 48kHz stereo/5.1 AC-3 audio stream. This is an experimental adapter constraint, not a complete UHD specification validator. Other input must be encoded separately. No SDR/HDR transformation is performed. English is currently the fixed audio language in generated metadata.

Successful builds contain `disc.iso` or `disc/`, `disc.meta`, and `build-report.json` (source properties, source SHA-256, ISO SHA-256 where applicable, chapter times, backend executable path, and limitations). Intermediate elementary streams are deleted after success. Failures retain partial files and `build-failure.json`; use a fresh directory to retry. A backend exit code and nonempty ISO are only structural smoke checks, not playback validation. Capture the actual backend version separately in the hardware test record.

The optional integration test generates a one-second synthetic 4K blue image with a tone using FFmpeg/libx265, then invokes the real backend. It is skipped unless explicitly enabled and does not test a physical player. Normal tests require only Node.js. CI runs the normal tests.
