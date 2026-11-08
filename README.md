# IIBIN JavaScript

> **BREAKING CHANGE: IIBIN 2.0 uses schema-defined protobuf wire messages. JavaScript 1.x payloads use different formats and cannot be read by the new `Schema` codec.** Move both sides of a connection to the same schema, or keep using the matching codec from `@intelligentintern/iibin/legacy`.

**2.0 is currently an alpha release.** Install it explicitly with
`npm install @intelligentintern/iibin@alpha`. The existing `latest` tag stays on
1.x. Version `2.0.0-alpha.2` makes the compatibility and migration guidance
explicit; its codec and wire format are unchanged from `2.0.0-alpha.1`.

Schema-defined protobuf wire messages for browser and Node.js. Matches the native C-backed `iibin` Python package and King's `King\IIBIN` codec. Install the 2.0 prerelease with `npm install @intelligentintern/iibin@alpha`.

```ts
import { Schema } from '@intelligentintern/iibin';
const message = new Schema({text: {id: 1, type: 'string'}});
const bytes = message.encode({text: 'Hallo'});
const decoded = message.decode(bytes);
```

## Migrating from JavaScript 1.x

1. **Existing payloads:** retain their matching decoder. The old exports moved from the package root to `/legacy`:

   ```ts
   // Previously: import { IIBINEncoder, IIBINDecoder } from '@intelligentintern/iibin';
   import { IIBINEncoder, IIBINDecoder } from '@intelligentintern/iibin/legacy';
   // IIBinProtocol and its related exports are also available from /legacy.
   ```

2. **New messages:** use `Schema` from the main package. Agree on identical field IDs, types, repeated fields and nested schemas in JavaScript, Python and PHP. A schema describes the complete application message, including any message type, request ID or timestamp you need.
3. **Stored data and live connections:** decode old data with its old codec, map the application fields, then encode with `Schema`. Choose the codec explicitly through endpoint negotiation or stored metadata. Schema messages contain no automatic legacy detector, schema identifier or protocol-version header; trying decoders until one succeeds is unsafe because old bytes may accidentally form valid protobuf fields.
4. **King:** deploy the accompanying native extension update for full `uint64`/`fixed64` range and aligned validation. Installing this npm package or the Python package does not update PHP's loaded `king.so`. King's schema codec already uses protobuf wire encoding; this does not introduce a second PHP wire format.

64-bit integers decode as JavaScript `bigint`, Python `int`, and PHP integers
or decimal strings for unsigned values above `PHP_INT_MAX`. Invalid UTF-8,
non-finite floats and out-of-range integers are rejected. Exchange messages
within 16 MiB and nesting depth 32. PHP-only schema features such as enum
registries, maps and oneof are not exposed by the JS/Python schema APIs.

Supports bool, UTF-8 string, raw bytes, signed/unsigned/zigzag/fixed 32/64-bit integers, float/double, nested messages and repeated fields. 64-bit integers decode as `bigint`; use `bigint` when encoding values outside JavaScript's safe integer range. Numeric repeated fields decode packed or unpacked. Unknown wire fields are skipped; unknown input keys, malformed fields, invalid UTF-8, non-finite floats, overflow and excessive nesting are rejected. Maximum frame size: 16 MiB; maximum nesting: 32. Schema field IDs follow protobuf rules. Absent fields stay absent; encoding uses unpacked repeated fields and preserves explicitly supplied scalar defaults.

This is the protobuf-wire schema path, not a claim to implement every King schema feature: enum registries, oneof declarations, maps and recursive named schema references are not currently exposed by this package. They can be represented by explicit application schemas where appropriate. The previous incompatible codecs remain under `@intelligentintern/iibin/legacy`; the main entry point does not auto-detect or silently fall back to them.

`make build` produces ESM, CommonJS and TypeScript declarations. `npm pack` checks types and rebuilds before packaging. The prerelease publishes under the `alpha` dist-tag; see [RELEASING.md](RELEASING.md). MIT license. The source is hosted at [Intelligent-Intern/iibin-js](https://github.com/Intelligent-Intern/iibin-js).

Python codec: [iibin-py](https://github.com/Intelligent-Intern/iibin-py). Lunar Charge Control and Shopfloor demo: [iibin-demo](https://github.com/Intelligent-Intern/iibin-demo).
