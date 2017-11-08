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

## 1.1.1 (2017-04-20)
  Patched bug with conductor resume function  
  Updated linter and refactored portions of bot middleware based on linter suggestions  
  Bumped Travis to node v7  

## 1.2.0 (2017-05-02)

### Improvements
  * Bots now generate park and unpark commands separate from pause / block commands
  * Generic Warning State now supported.
  * Can now update hostname directly from mcu at the endpoint /hostname

## 1.3.0 (2017-05-02)

### Improvements
  * Added support for Kloner3D and Makeit3D
  * Moved "Clear Buffer Command" to abstract away if using a command other that M400
  * Hide redundant bots if conducting and controlling bots on the same pi

## 1.3.1 (2017-05-02)

### Bug-Fixes
  * Patched Conductor initialization to have an array of warnings

## 1.3.2 (2017-05-03)

### Bug-Fixes
  * Patched Conductor's non-local players to have an array of warnings

## 1.4.0 (2017-05-18)

### Improvements
  * Moved logging to a gloval logger variable
  * Added UI for downloading log files, updating the hostname, and restarting MCU

## 1.4.1 (2017-05-22)

### Bug-Fixes
  * On boot, MCU now creates a "logs" folder if one doesn't exist

## 1.4.2 (2017-05-22)

### Bug-Fixes
  * Fixed hostname resolution on the Raspberry Pi
  
## 1.5.0 (2017-07-17)
  * Re-styled UI for more responsive experience
  * UI now auto-selects the first bot, if no bot is selected
  * Running jobs are canceled if the bot is disconnected
  * Added styles for if a file is dragged onto the UI

## 1.6.0 (2017-09-28)
  * Added UI feedback for if nozzle or bed is heating
  * Added feedback to button click and button hover
  * Added queueSequentialCommands and prependSequentialcommands to the commandQueue API
  * Can pass "; <<<PAUSE>>>" in gcode file to initiate pause, mid-print
  * Added "force" flag to process-gcode to allow gcode commands mid-print
  * Added ability to send-receive text updates if Twilio ENV setup
  
## 1.7.0 (2017-10-17)
  * Updated documentation to match the current environment
  * Added socket replies to the bot terminal window
  * Added support for a camera via mjpeg streamer on pis
  * Refactored app for building with electron
  * Added a "Remote" bot for registering a remote MCU instance
  * Added checksum support
  * Updated Serialport to v6
  * UI now build with create-react-app library
  
## 1.7.1 (2017-10-19)
  * Titan park routine moves up 10mm in Z
  
## 1.8.0 (2017-10-31)
  * Fixed bug where disconnect wasn't possible unless processing a job
  * Fixed reset button for raspberry pi
  * Fixed functionality for updating hostname on the pi
  * Fixed header padding on UI Files and Settings
  * Modified disable motors to be a single row
  * Added ability to tune flowrate and speed
  * Added "Live Jog" to enable jogging while a job is being processed
  * Temp commands can be so long as the bot is connected (mid-job temp change is not blocked)
  * Fixed bug with hovering luminesence resetting itself
  * Uniform command scheme where green is "GO" and red is "STOP"
  * Serial bots no longer show up unless they're connected

## 1.8.1 (2017-11-08)
  * Fixed Conductor "Add Player" functionality
  * Fixed Remote bot crash issue
  * Disabled editing or sending text when not connected