/* global $, io, ip, jobs, files */
$(document).ready(() => {
  $(`#jog-panel-svg`).load(`images/jog_panel.svg`, () => {
    const jogInfo = {
      axes: [
        { axis: `x`, alias: `X` },
        { axis: `y`, alias: `Y` },
        { axis: `z`, alias: `Z` },
        { axis: `e`, alias: `E` },
      ],
      distance: [
        { name: `100`, amount: `100` },
        { name: `10`, amount: `10` },
        { name: `1`, amount: `1` },
        { name: `0_1`, amount: `0.1` },
        { name: `-0_1`, amount: `-0.1` },
        { name: `-1`, amount: `-1` },
        { name: `-10`, amount: `-10` },
        { name: `-100`, amount: `-100` },
      ],
    };

    for (let i = 0; i < jogInfo.axes.length; i++) {
      for (let j = 0; j < jogInfo.distance.length; j++) {
        $(`.jog_${jogInfo.axes[i].axis}_${jogInfo.distance[j].name}`).click(() => {
          const gcode = `G1 ${jogInfo.axes[i].alias}${jogInfo.distance[j].amount}`;
          $.ajax({
            url: `/v1/bot/jog`,
            type: `POST`,
            data: {
              gcode,
            },
            success: () => {
              console.log(`gcode ${gcode} successfully sent`);
            },
            error: (err) => {
              addReply(gcode); // Hack to add data. remove this
              console.log('error', err);
            },
          });
        });
      }
    }
    $(`polygon`).click(function () {
      console.log(this);
    });
  });
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
      const jobDiv = `<div id="job_${job.uuid}"></div>`;
      $('#jobs').append(jobDiv);
      $jobDiv = $(`#job_${job.uuid}`);

      // Add an element for each job attribute
      for (const jobAttribute in job) {
        const attributeDiv =
          `<div class="square"><p id="job_${job.uuid}_${jobAttribute}">` +
          `${jobAttribute}: ${job[jobAttribute]}` +
          `</p></div>`;
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
      ourFile.parent().parent().parent().remove();
    }
  }

  function updateFile(file) {
    let $fileDiv = $(`#file_${file.uuid}`);
    if ($fileDiv.length === 0) {
      // If the file doesn't exist, add it

      // add it to the local "files" object
      files[file.uuid] = file;

      // and add it to the DOM
      const fileDiv = `
        <div class="col-xs-12 col-sm-6 col-md-6 col-lg-3">
          <div class="square">
            <div class="content">
              <div id="file_${file.uuid}">
                <div id="file_${file.uuid}_details" class="file-details">
                </div>
              </div>
            </div>
          </div>
        </div>`;
      $('#files').append(fileDiv);
      const $fileDiv = $(`#file_${file.uuid}`);
      const $fileDetailsDiv = $(`#file_${file.uuid}_details`);

      /// add more divs here if you want
      // $fileDiv.append(`<div class="example">fooooobar</div>`);
      $fileDiv.append(`
        <div class="file-download">
          <a href="http://${ip}:9000/v1/files/${file.uuid}/download">
            <i class="fa fa-download"></i>
          </a>
        </div>
      `);
      // Add an element for each job attribute
      for (const fileAttribute in file) {
        if (fileAttribute === `name` || fileAttribute === `dateChanged`) {
          const attributeDiv =
            `<span class="file_${fileAttribute}" id="file_${file.uuid}_${fileAttribute}">` +
            `${file[fileAttribute]}` +
            `</span>`;
          $fileDetailsDiv.append(attributeDiv);
        } else {
          const attributeDiv =
            `<span class="file_${fileAttribute}" id="file_${file.uuid}_${fileAttribute}">` +
            `${file[fileAttribute]}` +
            `</span>`;
          $fileDiv.append(attributeDiv);
        }
      }

      // Add a delete button to the file div
      const deleteButton = `<div id="file_${file.uuid}_delete" class="delete"><i class="fa fa-times"></i></div>`;
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
      const processFileButton = `<div id="file_${file.uuid}_process" class="play-area"><i class="fa fa-play"></i></div>`;
      $fileDiv.append(processFileButton);
      $(`#file_${file.uuid}_process`).click(() => {
        const warningMessage = `Are you sure you want to process file "${file.name}"?`;
        if (confirm(warningMessage)) {
          $.ajax({
            url: `http://${ip}:9000/`, // TODO fix this hacky port derived address
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
      /// add more divs here if you want
      // $fileDiv.append(`<div class="example">fooooobar</div>`);
    } else {
      // Update each file attribute
      for (const fileAttribute in file) {
        const attributeText = `${fileAttribute}: ${file[fileAttribute]}`;
        $(`#file_${file.uuid}_${fileAttribute}`).text(attributeText);
      }
    }
  }

  function addReply(reply) {
    $(`#terminal-reply`).append(`<li>${reply}</li>`);
    const divx = document.getElementById(`terminal-reply`);
    console.log('divx scrollTop', divx.scrollTop);
    divx.scrollTop = divx.scrollHeight;
    // TODO disable auto scrolling if a `disable auto-scroll` checkbox is selected
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

  socket.on('botReply', (reply) => {
    addReply(reply);
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
    const $fileUploadProgress = $(`#file-upload-progress`);
    const $fileUploadProgressBar = $(`#file-upload-progress-bar`);
    if (e.lengthComputable) {
      const progress = parseInt(e.loaded / e.total * 100, 10);
      $fileUploadProgress.css(`width`, `${progress}%`);
      if (progress >= 100) {
        setTimeout(() => {
          $fileUploadProgressBar.removeClass(`visible`);
        }, 1000);
        setTimeout(() => {
          $fileUploadProgress.css(`width`, `0%`);
        }, 2000);
      }
    }
  }

  const $fileForm = $(`#file-form`);
  const $fileFormInput = $(`#file-form-input`);
  const $fileUploadProgressBar = $(`#file-upload-progress-bar`);
  $fileForm.change(() => {
    const formData = new FormData($fileForm[0]);
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
        $fileUploadProgressBar.addClass(`visible`);
        // Call action here before the file is uploaded
      },
      success: () => {
        // Clear the selected file
        $fileFormInput.val('');
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

  // TODO disable clicking when a file is being uploaded
  $(`#select-file`).click(() => {
    $fileFormInput.click();
  });

  const $gcodeTerminal = $(`#gcode-terminal`);
  $gcodeTerminal.submit((e) => {
    e.preventDefault();
    const gcode = $(`#gcode-input`).val();
    if (true) { // need to validate gcode here
      $(`#gcode-input`).val(``);
      $.ajax({
        url: `/v1/bot/processGcode`,
        type: `POST`,
        data: {
          gcode,
        },
        success: () => {
          console.log(`gcode ${gcode} successfully sent`);
        },
        error: (err) => {
          addReply(gcode); // Hack to add data. remove this
          console.log('error', err);
        },
      });
    }
  });
});
