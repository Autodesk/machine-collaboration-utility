#!/bin/sh
cd /home/pi/hydraprint
/usr/bin/git pull origin production
/home/pi/.nvm/versions/node/v6.4.0/bin/node /home/pi/hydraprint/node_modules/gulp/bin/gulp.js build
