#!/bin/bash
if [ "${CI_DEBUG}" == "true" ]; then
    set -x
fi

npm config set //artifactory.eeas.europa.eu/artifactory/api/npm/npmjs-virtual/:_authToken="$(cat /run/secrets/artifactory_token)" --global;
npm config set registry https://artifactory.eeas.europa.eu/artifactory/api/npm/npmjs-virtual/ --global;

if [ "${CI_DEBUG}" == "true" ]; then
    npm config ls -l;
fi