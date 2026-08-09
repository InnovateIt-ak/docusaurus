#!/bin/bash

chmod +x /srv/app/npm-config-clear.sh /srv/app/npm-config-set.sh;
# 1 SET NPM CONFIG FOR ARTIFACTORY
bash /srv/app/npm-config-set.sh;

# 2 INSTALL PACKAGES :DEBUG env
if [[ "${CI_DEBUG}" == "true" ]]; then
  npm install --loglevel verbose;
else
  npm install --loglevel verbose;
fi

# DELETE NPM CONFIG FOR ARTIFACTORY
bash /srv/app/npm-config-clear.sh;
