# Preflight static site

Requires Node 20. From `site/`: `npm ci`, then `npm run build`.
`npm run dev` serves the site under `/preflight`; `npm run preview` previews the build.

Build inputs are `../public-data/api/v1/index.json`, `changes.json` and
`preflight/*.json`. Missing files use `fixtures/api/v1/`. Missing or empty
preflight directories use all three fictional, unsigned example domains.
Malformed published JSON fails the build rather than silently becoming demo data.
The build copies the public API verbatim and fills only missing fixture paths,
publishes `../public-data/scans/*.json` verbatim at `/preflight/scans/<domain>.json` for explicit untrusted evidence retrieval,
then publishes the repository's public JWKS at both required paths. No private
key, runtime API, paid service or environment API key is needed.

Pages deployment runs on main pushes or manual dispatch. In repository Settings
→ Pages, select GitHub Actions as the source. Deployment is separate from this
feature branch's push. All workflow actions are pinned to commit SHAs.

The local stdio MCP server uses `mcp/server.js` directly with Node 20+: `npm ci`,
`npm test`, `npm start` from `mcp/`. See `mcp/README.md` for Desktop configuration.
