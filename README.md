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
