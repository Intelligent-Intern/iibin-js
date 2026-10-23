# IIBIN JavaScript

Schema-defined protobuf wire messages for browser and Node.js. Matches the native C-backed `iibin` Python package. This 2.0 prerelease has not been published.

```ts
import { Schema } from '@intelligentintern/iibin';
const message = new Schema({text: {id: 1, type: 'string'}});
const bytes = message.encode({text: 'Hallo'});
const decoded = message.decode(bytes);
```

Supports bool, UTF-8 string, raw bytes, signed/unsigned/zigzag/fixed 32/64-bit integers, float/double, nested messages and repeated fields. 64-bit integers decode as `bigint`; use `bigint` when encoding values outside JavaScript's safe integer range. Numeric repeated fields decode packed or unpacked. Unknown wire fields are skipped; unknown input keys, malformed fields, invalid UTF-8, non-finite floats, overflow and excessive nesting are rejected. Maximum frame size: 16 MiB; maximum nesting: 32. Schema field IDs follow protobuf rules. Absent fields stay absent; encoding uses unpacked repeated fields and preserves explicitly supplied scalar defaults.

This is the protobuf-wire schema path, not a claim to implement every King schema feature: enum registries, oneof declarations, maps and recursive named schema references are not currently exposed by this package. They can be represented by explicit application schemas where appropriate. The previous incompatible codecs remain under `@intelligentintern/iibin/legacy`; the main entry point does not auto-detect or silently fall back to them.

`make build` produces ESM, CommonJS and TypeScript declarations. MIT license. No remote repository or registry release has been created yet.
