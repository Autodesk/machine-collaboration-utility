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
      const jobDiv = `<div id="job_${job.id}"><ul><li>ID: ${job.id}</li><li>State: <span id="job_${job.id}_state">${job.state}</span></li><li>Created: ${job.started ? job.started: ''}</li><li>Elapsed: ${job.elapsed ? job.elapsed: ''}</li></ul></div>`;
      $('#jobs').append(jobDiv);
    } else {
      $(`#job_${job.id}_state`).text(job.state);
      console.log('need to update the current job', job);
    }
  });
});
