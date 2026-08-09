#!/bin/bash
set -ex
# config artifactory for npm
rm -rf /srv/app/build/*
rm -rf /srv/.docusaurus
mkdir -p /srv/app/build


# Git must be trusted before we can inspect anything: the mounted .git belongs
# to the runner user, not to the container user.
git config --global --add safe.directory /srv/app

# Docusaurus >= 3.10 eagerly resolves every submodule path (realpath) before it
# reads git history. Submodules are declared in the index but never cloned in
# CI, so recreate them as empty placeholders to keep that resolution happy.
if [ -d /srv/app/.git ]; then
  git -C /srv/app ls-files --stage \
    | sed -n 's/^160000 [0-9a-f]\{40,\} [0-9]\t//p' \
    | while IFS= read -r submodule_path; do
        echo "creating placeholder for declared submodule: ${submodule_path}"
        mkdir -p "/srv/app/${submodule_path}"
      done
fi

if [ -d "./docs/openapi" ] && [ "$(ls -A ./docs/openapi 2>/dev/null)" ]; then
  mkdir -p redocusaurus
  echo  "move files to redocusaurus"
  cp -a ./docs/openapi/. ./redocusaurus/
fi

if [ "$ENABLE_LIKEC4" = 'true' ]; then
  npm run build-likec4-react
else
  rm -rf /srv/app/src/pages/likec4.tsx
fi

git config --global --add safe.directory /srv/app

if [ "$ENABLE_LOCAL" = 'true' ]; then
  npm run start
else
  # Output into a sub-dir of the mounted volume, not its root: docusaurus build
  # wipes outDir with rmdir, which fails (EBUSY) on a mount point.
  npm run build -- --out-dir build/html
fi
