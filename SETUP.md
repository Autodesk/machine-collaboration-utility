# Setting up HardwareHub
## "HardwareHub" software creates a browser-driven user interface and API portal for a piece of hardware.
### These instructions will explain how to get a raspberry pi set up as an interface for your hardware.

In order to use HardwareHub, you will need the following:
 - Raspberry PI
 - Raspberry PI power supply
 - Micro SD card (preferably 4GB or larger)
 - Ethernet cable
 - Access to a router with multiple ethernet ports
 - A hardware device that you want to control and any associated components
   - i.e.  
     - A 3D printer, 3D printer power supply, and a cable to connect the printer's control board to the PI  

# Lets set this thing up!

1. Download the "Hardware Hub" Raspberry PI image [here](http://www.zonbo.com)
2. Unzip the downloaded file.
3. Install the unzipped .img file onto a micro SD card  
    - Instructions available [here](https://www.raspberrypi.org/documentation/installation/installing-images/README.md)
4. (While powered down) insert the sd card into the Raspberry pi and connect the pi to your network router via an ethernet cable  
5. Connect usb power to the Raspberry pi
6. SSH into your raspberry pi via terminal. The IP address is "hardwarehub.local" and the password is "raspberry" 
    - Note: On windows in order to use a ".local" IP address you must have [Bonjour](https://support.apple.com/kb/DL999?viewlocale=en_US&locale=en_US) installed.
    - Extra details on how to "ssh" into a computer [here](https://www.raspberrypi.org/documentation/remote-access/ssh/)
```
ssh pi@hardwarehub.local
password: raspberry
```
7. Expand the SD card's file size and customize your endpoint's name

    - Enter configuration mode on your pi by typing the following:
```
sudo raspi-config
```
    7a. Select "1 Expand Filesystem" and hit "enter"
    7b. Select "OK" to confirm the operation once it is complete
    7c. We suggest updating the raspberry pi's password from "raspberry" to a unique password of your choosing.
      - To update the password select "2 Change User Password" and follow the dialog
    7c. Navigate to and select "9 Advanced Options" by typing "enter"
    7d. Navigate to and select "A2 Hostname" by typing "enter"
    7e. Read the naming convention instructions and then type "enter"
    7f. Erase (with backspace) the existing name "HardwareHub" and replace it with a unique name, appropriate for the bot that it will be connected to.
      - Be sure to keep track of the new name.
    7g. After you have entered the desired name, press "down" and select "ok"
    7h. Select "Finish" (You have to hit the "right" arrow in order to highlight it)
    7i. Select "Yes" when asked to reboot

Per, the name that you chose in step 7f, your device should now be available via any browser at "http://yourbotname.local".