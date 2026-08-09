#!/bin/bash
if [ "${CI_DEBUG}" == "true" ]; then
    set -x
fi

npm config delete registry https://artifactory.eeas.europa.eu/artifactory/api/npm/npmjs-virtual/ --global;
npm config delete //artifactory.eeas.europa.eu/artifactory/api/npm/npmjs-virtual/:_authToken --global;

if [ "${CI_DEBUG}" == "true" ]; then
    npm confi ls -l
fi