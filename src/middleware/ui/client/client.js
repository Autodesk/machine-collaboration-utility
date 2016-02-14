/* global $, io */
$(document).ready(() => {
  const socket = io('http://localhost:9000');
  socket.on('stateChange', (newState) => {
    $('#hardwareState').text(newState);
  });


  // for(var i = 0; i < jobArray.length, i++){
  //   consol
  // }
  socket.on('jobEvent', (job) => {
    var ourJob = $(`#job_${job.id}`);
    if (ourJob.length === 0) {
      console.log('the job', job);
      const jobDiv = `<div id="job_${job.id}"><p>ID: ${job.id} State: <span id="job_${job.id}_state">${job.state}</span></p></div>`;
      $('#jobs').append(jobDiv);
    } else {
      $(`#job_${job.id}_state`).text(job.state);
      console.log('need to update the current job', job);
    }
  });
});
