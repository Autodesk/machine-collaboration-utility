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
      const jobDiv = `<div id="job_${job.id}"><ul><li>ID: ${job.id}</li><li>State: <span id="job_${job.id}_state">${job.state}</span></li><li>Started: <span id="job_${job.id}_started">${job.started}</span></li><li>Elapsed: <span id="job_${job.id}_elapsed">${job.elapsed}</span></li><li>Percent Complete: <span id="job_${job.id}_percent_complete">${job.percentComplete}</span></li></ul></div>`;
      $('#jobs').append(jobDiv);
    } else {
      $(`#job_${job.id}_state`).text(job.state);
      $(`#job_${job.id}_started`).text(job.started);
      $(`#job_${job.id}_elapsed`).text(job.elapsed);
      $(`#job_${job.id}_percent_complete`).text(job.percentComplete);
    }
  });
});
