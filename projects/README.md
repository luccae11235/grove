# Standalone Grove projects

This directory is the registry for code projects that can be distributed as
independent GitHub repositories. The monorepo remains the editing source of
truth; each external repository is a controlled mirror of one source directory.

`manifest.json` records the source, canonical article path, required standalone
files, test command, destination repository, and distribution status. A project
becomes publishable only after its `repository` is configured and its status is
changed from `ready-local` to `ready-to-publish`.

```bash
# Verify every registered project in place.
pnpm projects:validate

# Produce a clean standalone directory without publishing it.
pnpm projects:export --project grove-tree-core \
  --site-url https://your-grove-domain.example \
  --output /tmp/grove-tree-core

# Mirror to a configured GitHub repository. This never force-pushes.
pnpm projects:publish --project grove-tree-core \
  --site-url https://your-grove-domain.example \
  --confirm PUBLISH:grove-tree-core
```

Generated files, workspace dependencies, secrets, and the parent repository's
Git history are excluded. The publishing command clones the destination first,
commits the synchronized project, and performs a normal push so remote history
cannot be overwritten silently.
