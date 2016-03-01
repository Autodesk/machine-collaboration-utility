/* global $, io, ip */
$(document).ready(() => {
  const socket = io(`http://${ip}:9000`);
  socket.on('stateChange', (newState) => {
    $('#hardwareState').text(newState);
  });


  // for(var i = 0; i < jobArray.length, i++){
  //   consol
  // }
  socket.on('jobEvent', (job) => {
    var ourJob = $(`#job_${job.uuid}`);
    if (ourJob.length === 0) {
      const jobDiv = `<div id="job_${job.uuid}"><ul><li>ID: ${job.uuid}</li><li>State: <span id="job_${job.uuid}_state">${job.state}</span></li><li>Started: <span id="job_${job.uuid}_started">${job.started}</span></li><li>Elapsed: <span id="job_${job.uuid}_elapsed">${job.elapsed}</span></li><li>Percent Complete: <span id="job_${job.uuid}_percent_complete">${job.percentComplete}</span></li></ul></div>`;
      $('#jobs').append(jobDiv);
    } else {
      $(`#job_${job.uuid}_state`).text(job.state);
      $(`#job_${job.uuid}_started`).text(job.started);
      $(`#job_${job.uuid}_elapsed`).text(job.elapsed);
      $(`#job_${job.uuid}_percent_complete`).text(job.percentComplete);
    }
  });
});
