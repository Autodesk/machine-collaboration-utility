# Hydra-Print

An es7 friendly 3D Printer Manager

The framework is built on top of
- Koa 2
- Koa Bark
- Sequelize
- Socket.io

Install all dependencies
```
npm install
```

The app requires a postgres database (current hard coded to localhost port 5432).
Create a '.env' file in the project's root folder with the following information:  
```
username=yourpostgresusername
password=yourpostgrespassword
dbname=yourdbname
PORT=whatverportyouwant
```

Run server  
```
npm start
```


Run tests  
```
npm test
```

### Setting up postgres on a raspberry pi
These instructions assume setting both the username and database to "postgres"  
```
sudo mkdir /var/local/repository  
cd /var/local/repository  
sudo wget -O postgresql-9.4.4-raspbian.tgz https://www.dropbox.com/s/t9x78hbfo2mb8yi/postgresql-9.4.4-raspbian.tgz?dl=1  
sudo tar -xvzf postgresql-9.4.4-raspbian.tgz  
echo "deb [ trusted=yes ] file:///var/local/repository ./" | sudo tee /etc/apt/sources.list.d/my_own_repo.list  
sudo apt-get update  
sudo apt-get install postgresql-9.4  

```

### Then set the psql password
```
sudo -iu postgres psql -c "\password postgres"
```
