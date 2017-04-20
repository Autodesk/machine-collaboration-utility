# MCU Changelog

## 1.0.0 (2017-02-24)
  First release with new versioning scheme.

### Improvements
  * [#2](https://github.com/Autodesk/machine-collaboration-utility/issues/2) - Conductor should be "bot-type" agnostic
  * Added KLONER3D as a supported bot

## 1.0.1 (2017-03-02)
  Minor fixes to conductor, Kloner3D, Smoothieboard, and UI ordering

### Improvements
  * Conductor no longer adds player bots, if the bot endpoint shares the server's IP address
  * USB discovery will patch in the serial number if the port information doesn't include a pnpid
  * "Jobs" is removed rom the UI until functionality is worked out
  * Bots are listed alphabetically
  * Files are listed with the most recently modified first

## 1.0.2 (2017-03-02)
  Fixed updating settings on the wrong bot, bug.

## 1.0.3 (2017-03-16)
  Database and UI updates
  
### Improvements
  * Updated bot "custom" field from 255 characters to unlimited characters
  * Added per-bot verbose serial logging
  * Default bot will reset its current job referece once it completes said job
  * Created UI tweak to allow kicking off a file to filter the available bots
  * Fixed bug with creating a virtual bot

## 1.1.0 (2017-04-19)
  Refactored Bot / Job state machine and Bot MVC setup
  
### Improvements
  * Replaced native promises with Bluebird promises
  * Using Async/Await
  * Restructured Job state machine
  * Restructured Bot state machine
  * Now using the gcode-json-converter library
  * Refactored command queue to process async functions
  * Removed "HardwareHub" style printer
  * Standard file consumption now set up through "Virtual Bot" "StartJob" command
