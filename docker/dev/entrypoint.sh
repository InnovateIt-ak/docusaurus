#!/bin/bash
set -ex
#config artifactory for npm
chmod +x ./docker/npm/npm-config-set.sh
bash ./docker/npm/npm-config-set.sh

if [ "$1" = 'dev' ] || [ "$1" = 'dev-container' ]; then
    if [[ "${DEBUG}" == "true" ]]; then
        npm install --loglevel verbose;
    else
        npm install
    fi
fi;

npm run clear

if [ "$1" = 'dev' ]; then
    npm run build-likec4-react;
    npm run start;
fi;