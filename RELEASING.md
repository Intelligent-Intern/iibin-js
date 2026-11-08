# Publishing to npm

The 2.0 schema codec changes the 1.x wire format. Publish prereleases under
`alpha`; keep the existing `latest` tag until a stable release is intended.

```bash
npm ci --ignore-scripts
npm login
mkdir -p artifacts
npm pack --pack-destination artifacts
npm publish ./artifacts/intelligentintern-iibin-2.0.0-alpha.2.tgz --access public --tag alpha
```

`prepack` cleans, typechecks and builds ESM, CommonJS and TypeScript declarations.
Before publishing, install the tarball into a fresh project and check both
imports, `/legacy`, and the workspace's `../interop/check.py` against Python and
the rebuilt King extension. Publish the tested tarball, not an untested rebuild.
Package versions are immutable on npm; increase the version and lockfile for
the next release.
