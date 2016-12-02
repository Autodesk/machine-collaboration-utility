const exec = require("child_process").exec;

let hardwareDependencies = null;

if (process.env.CONTINUOUS_INTEGRATION !== 'true') {
  hardwareDependencies = require('./hardwareDependencies.json');
}

  // Mac dependencies
if (hardwareDependencies) {
  for (var package in hardwareDependencies.dependencies) {
    var oscmd   = "npm install " + package;
    exec(oscmd, function(error, stdout, stderr) {
      if (error)  {
        console.log("ERROR:", error);
      }
      if (stdout) {
        console.log( stdout );
      }
      if (stderr) {
        console.log( stderr );
      }
    });
  }
}
