/* global $, io, ip, jobs, files */
$(document).ready(() => {
  function deleteJob(job) {
    const ourJob = $(`#job_${job.uuid}`);
    if (ourJob.length > 0) {
      delete jobs[job.uuid];
      ourJob.remove();
    }
  }

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
        const attributeDiv =
          `<p id="job_${job.uuid}_${jobAttribute}">` +
          `${jobAttribute}: ${job[jobAttribute]}` +
          `</p>`;
        $jobDiv.append(attributeDiv);
      }

      // Add a delete button to the job div
      const deleteButton = `<div id="job_${job.uuid}_delete">X</div>`;
      $jobDiv.append(deleteButton);
      $(`#job_${job.uuid}_delete`).click(() => {
        const warningMessage = `Are you sure you want to delete job "${job.uuid}"?`;
        if (confirm(warningMessage)) {
          $.ajax({
            url: `/v1/jobs/`,
            type: `DELETE`,
            data: {
              uuid: job.uuid,
            },
            success: () => {
              deleteJob(job);
            },
            error: (err) => {
              console.log('error', err);
            },
          });
        }
      });
    } else {
      // Update each job attribute
      for (const jobAttribute in job) {
        const attributeText = `${jobAttribute}: ${job[jobAttribute]}`;
        $(`#job_${job.uuid}_${jobAttribute}`).text(attributeText);
      }
    }
  }

  function deleteFile(file) {
    const ourFile = $(`#file_${file.uuid}`);
    if (ourFile.length > 0) {
      delete files[file.uuid];
      ourFile.remove();
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
        const attributeDiv =
          `<p id="file_${file.uuid}_${fileAttribute}">` +
          `${fileAttribute}: ${file[fileAttribute]}` +
          `</p>`;
        $fileDiv.append(attributeDiv);
      }

      // Add a delete button to the file div
      const deleteButton = `<div id="file_${file.uuid}_delete">X</div>`;
      $fileDiv.append(deleteButton);
      $(`#file_${file.uuid}_delete`).click(() => {
        const warningMessage = `Are you sure you want to delete file "${file.name}"?`;
        if (confirm(warningMessage)) {
          $.ajax({
            url: `/v1/files/`,
            type: `DELETE`,
            data: {
              uuid: file.uuid,
            },
            success: () => {
              deleteFile(file);
            },
            error: (err) => {
              console.log('error', err);
            },
          });
        }
      });

      // Add a process file button to the file div
      const processFileButton = `<div id="file_${file.uuid}_process">Process File</div>`;
      $fileDiv.append(processFileButton);
      $(`#file_${file.uuid}_process`).click(() => {
        const warningMessage = `Are you sure you want to process file "${file.name}"?`;
        if (confirm(warningMessage)) {
          $.ajax({
            url: ``,
            type: `POST`,
            data: {
              command: `processFile`,
              fileUuid: file.uuid,
            },
            success: () => {
              console.log('success!');
            },
            error: (err) => {
              console.log('error', err);
            },
          });
        }
      });
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

  socket.on('deleteFile', (file) => {
    deleteFile(file);
  });

  socket.on('deleteJob', (job) => {
    deleteJob(job);
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

  // connect the device on click of connect button
  $(`#connect`).click(() => {
    // a hack for prototyping, if no device is available, make a virtual device
    if ($(`#hardwareState`).text() === `unavailable`) {
      $.ajax({
        url: `/v1/bot`,
        type: `POST`,
        data: {
          command: `createVirtualBot`,
        },
        success: () => {
          $.ajax({
            url: `/v1/bot`,
            type: `POST`,
            data: {
              command: `connect`,
            },
            success: () => {
              console.log('virtual connect success!');
            },
            error: (err) => {
              console.log('error', err);
            },
          });
        },
        error: (err) => {
          console.log('error', err);
        },
      });
    } else {
      $.ajax({
        url: `/v1/bot`,
        type: `POST`,
        data: {
          command: `connect`,
        },
        success: () => {
          console.log('connect success!');
        },
        error: (err) => {
          console.log('error', err);
        },
      });
    }
  });

  function progressHandlingFunction(e) {
    if (e.lengthComputable) {
      $('progress').attr({ value: e.loaded, max: e.total });
    }
  }

  $(':button').click(() => {
    const formData = new FormData($('form')[0]);
    $.ajax({
      url: 'v1/files',  // Server script to process data
      type: 'POST',
      xhr: () => {  // Custom XMLHttpRequest
        const myXhr = $.ajaxSettings.xhr();
        if (myXhr.upload) { // Check if upload property exists
          // Update the progress of the upload
          myXhr.upload.addEventListener('progress', progressHandlingFunction, false);
        }
        return myXhr;
      },
      // Ajax events
      beforeSend: () => {
        // Call action here before the file is uploaded
      },
      success: () => {
        // Call action here after the file is successfully uploaded
      },
      error: (err) => {
        console.log('Upload error:', err);
      },
      // Form data
      data: formData,
      // Options to tell jQuery not to process data or worry about content-type.
      cache: false,
      contentType: false, // TODO Restrict the files to .gcode
      processData: false,
    });
  });
});
