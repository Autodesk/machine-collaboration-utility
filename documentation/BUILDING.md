### Install Raspberry Pi usb driver libraries (Only necessary if using a Raspberry Pi)
```
sudo apt-get install build-essential libudev-dev
```

### Install NodeJS (NVM recommended)
Copy and paste the script below to install NVM (Node Version Manager).
```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | bash
```

Now we're going to run a few steps to get NVM up and running.  
**Copy and paste** the code below into your terminal. It will do the following:
- Set nvm to run whenever you open a terminal
```
sudo echo ". ~/.nvm/nvm.sh" >> ~/.bashrc
```
- Run nvm for this terminal instance
```
. ~/.nvm/nvm.sh
```
- Download Node V8.
```
nvm install v8
```

### Install all NodeJS dependencies:
```
npm install
```

Create a '.env' file in the project's root folder with the following information:  
```
username=your-user-name
password=any-password
dbname=db-name
PORT=9000
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
