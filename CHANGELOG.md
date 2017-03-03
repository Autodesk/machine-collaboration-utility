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
