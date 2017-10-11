// In order to run tests, we have to avoid installing hardware packages
// such as Serialport and Usb
// This command is run after regular install to make sure all hardware packages are installed
// For normal operation but not during continuous integration via travis.ci
const exec = require("child_process").exec;

let hardwareDependencies = null;
if (process.env.CONTINUOUS_INTEGRATION !== "true") {
  hardwareDependencies = require("./hardwareDependencies.json");
}

if (hardwareDependencies && Object.keys(hardwareDependencies).length > 0) {
  let installCommand = "npm install --no-save";
  Object.entries(
    hardwareDependencies
  ).forEach(([packageName, packageVersion]) => {
    installCommand += ` ${packageName}@${packageVersion}`;
  });

  exec(installCommand, (error, stdout, stderr) => {
    if (error) {
      console.log("ERROR:", error);
    }
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.log(stderr);
    }
  });
}
