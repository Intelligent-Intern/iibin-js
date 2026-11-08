# Changelog

## 2.0.0-alpha.2 — 2026-11-04

- Put the IIBIN 2.0 / legacy JavaScript 1.x compatibility notice at the top of the package description.
- Document old-data conversion, explicit format selection, shared schema examples and the separate native King deployment.
- Include `MIGRATION.md` and this changelog in the package.
- No codec or wire-format changes from 2.0.0-alpha.1.

## 2.0.0-alpha.1 — 2026-11-04

- Publish the 2.0 alpha schema codec using protobuf wire messages shared by Python, JavaScript and King.
- Encode fields in tag order, preserve text BOMs, align empty packed fields and reject out-of-range int32 encodings.
- Verify fixed wire vectors and every direction of Python/JavaScript/King decoding.
- JavaScript 1.x formats are separate legacy formats; the npm 2.0 main entry point exposes `Schema`, with previous codecs under `/legacy`.
- The accompanying King native update supports the full unsigned 64-bit range as PHP integers/decimal strings and aligns UTF-8, finite-number and tag validation. The npm/PyPI packages do not install that PHP extension update.
