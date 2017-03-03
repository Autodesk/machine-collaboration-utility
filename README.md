# Machine Collaboration Utility  ![mcu build status](https://travis-ci.org/Autodesk/machine-collaboration-utility.svg?branch=master)

A generalized host for communicating with hardware.  
Built with Raspberry Pi and Arduino (Marlin Firmware) in mind, but extensible for other firmware and communication protocols.

## How to use
                                       
Download the Raspberry Pi image [here](https://drive.google.com/open?id=0B7k-k73S74JBcVV0R2lOSEtLelE).  

### Install Raspberry Pi usb driver libraries (Only necessary if using a Raspberry Pi)
```
sudo apt-get install build-essential libudev-dev
```

### Install NodeJS (NVM recommended)
Copy and paste the script below to install NVM (Node Version Manager).
```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.1/install.sh | bash
```

Now we're going to run a few steps to get NVM up and running.  
**Copy and paste** the code below into your terminal. It will do the following:
- Set nvm to run whenever you open a terminal
```
sudo echo ". ~/.nvm/nvm.sh" >> ~/.bashrc
```
- Run nvm for this terminal window instance
```
. ~/.nvm/nvm.sh
```
- Download Node V6 or higher.  
```
nvm install v6.9.1
```

### Install all NodeJS dependencies:
```
npm install
```

The app requires a postgres database (currently hard coded to localhost port 5432).  
## Setting up Postgres
#### Mac:  
Download and setup the [postgres app](http://postgresapp.com/).
Create a '.env' file in the project's root folder with the following information:  
```
username=your-user-name
password=postgres
dbname=postgres
PORT=9000
```

#### Raspberry Pi:  
```
sudo mkdir /var/local/repository  
cd /var/local/repository  
sudo wget -O postgresql-9.4.4-raspbian.tgz https://www.dropbox.com/s/t9x78hbfo2mb8yi/postgresql-9.4.4-raspbian.tgz?dl=1  
sudo tar -xvzf postgresql-9.4.4-raspbian.tgz  
echo "deb [ trusted=yes ] file:///var/local/repository ./" | sudo tee /etc/apt/sources.list.d/my_own_repo.list  
sudo apt-get update  
sudo apt-get install postgresql-9.4  
sudo systemctl enable postgresql
sudo systemctl start postgresql  

```
Create a '.env' file in the project's root folder with the following information:  
```
username=postgres
password=postgres
dbname=postgres
PORT=9000
```

## Setting/changing the psql password
```
sudo -iu postgres psql -c "\password postgres"
```

## Running the app
#### Run tests  
```
npm test
```
#### Run the server
```
npm start
```
