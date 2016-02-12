/* global $, io */
$(document).ready(() => {
  const socket = io('http://localhost:9000');
  socket.on('stateChange', (newState) => {
    $('#hardwareState').text(newState);
  });
});
