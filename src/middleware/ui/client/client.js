/* global $, io, ip, jobs, files */
$(document).ready(() => {
  function updateJob(job) {
    let $jobDiv = $(`#job_${job.uuid}`);
    if ($jobDiv.length === 0) {
      // If the job doesn't exist, add it
      jobs[job.uuid] = job;
      const jobDiv = `<div id="job_${job.uuid}"><br></div>`;
      $('#jobs').append(jobDiv);
      $jobDiv = $(`#job_${job.uuid}`);

      // Add an element for each job attribute
      for (const jobAttribute in job) {
        const attributeDiv = `<p id="job_${job.uuid}_${jobAttribute}">${jobAttribute}: ${job[jobAttribute]}</p>`;
        $jobDiv.append(attributeDiv);
      }
    } else {
      // Update each job attribute
      for (const jobAttribute in job) {
        const attributeText = `${jobAttribute}: ${job[jobAttribute]}`;
        $(`#job_${job.uuid}_${jobAttribute}`).text(attributeText);
      }
    }
  }

  function updateFile(file) {
    let $fileDiv = $(`#file_${file.uuid}`);
    if ($fileDiv.length === 0) {
      // If the file doesn't exist, add it
      files[file.uuid] = file;
      const fileDiv = `<div id="file_${file.uuid}"><br></div>`;
      $('#files').append(fileDiv);
      $fileDiv = $(`#file_${file.uuid}`);

      // Add an element for each job attribute
      for (const fileAttribute in file) {
        const attributeDiv = `<p id="file_${file.uuid}_${fileAttribute}">${fileAttribute}: ${file[fileAttribute]}</p>`;
        $fileDiv.append(attributeDiv);
      }
    } else {
      // Update each file attribute
      for (const fileAttribute in file) {
        const attributeText = `${fileAttribute}: ${file[fileAttribute]}`;
        $(`#file_${file.uuid}_${fileAttribute}`).text(attributeText);
      }
    }
  }

  const socket = io(`http://${ip}:9000`);
  socket.on('stateChange', (newState) => {
    $('#hardwareState').text(newState);
  });

  socket.on('jobEvent', (job) => {
    updateJob(job);
  });

  socket.on('deleteJob', (job) => {
    const ourJob = $(`#job_${job.uuid}`);
    if (ourJob.length > 0) {
      delete jobs[job.uuid];
      ourJob.remove();
    }
  });

  socket.on('fileEvent', (file) => {
    updateFile(file);
  });

  for (const job in jobs) {
    if (jobs.hasOwnProperty(job)) {
      updateJob(jobs[job]);
    }
  }

  for (const file in files) {
    if (files.hasOwnProperty(file)) {
      updateFile(files[file]);
    }
  }
});
