'use strict';

const exec = require(`child_process`).exec;
let dependencies = null;

if (process.platform === `win32` || process.platform === `darwin`) {
  dependencies = require(`./package_desktop.json`).dependencies;
} else {
  dependencies = require(`./package_pi.json`).dependencies;
}

if (dependencies) {
  for (let dep in dependencies) {
     var oscmd = "npm install " + dep;
     exec(oscmd, function(error, stdout, stderr) {
       if (error)  console.log("ERROR:", error);
       if (stdout) console.log( stdout );
       if (stderr) console.log( stderr );
     });
  }
}
