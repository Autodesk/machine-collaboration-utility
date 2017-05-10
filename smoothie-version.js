const serialport = require('serialport');

serialport.list((err, ports) => {
  for (const port of ports) {
    if (port.vendorId === '0x1d50' && port.productId === '0x6015') {
      const myPort = new serialport(port.comName, { baudrate: 230400 });
      myPort.on('data', data => { console.log('Data:', data.toString()) });
      myPort.on('open', () => {
        myPort.write('version\n');
      });
    }
  }
});

