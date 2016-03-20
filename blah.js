const fs = require('fs-promise');

fs.readdir('./').then((one,two,three) =>{
  console.log(one, two, three);
});
