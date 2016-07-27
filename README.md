# Hydra-Print

An es7 friendly Gcode Client

The framework is built on the following the following libraries/technologies:
- Koa 2
- Koa Bark
- Sequelize
- Socket.io

Built and tested using Node V6.2

Install all dependencies:
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
sudo service postgresql start  

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

## Installing Raspberry Pi usb driver libraries
```
sudo apt-get install build-essential libudev-dev
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

All API documentation can be found at localhost:9000/docs
