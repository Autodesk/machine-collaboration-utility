/* global $, tasks */
$(document).ready(() => {
  function taskDeleteListener(task) {
    $('#taskDelete' + task.id).click(() => {
      $.ajax({
        type: 'DELETE',
        url: '/',
        headers: { 'accept': 'application/json' },
        data: {
          id: task.id,
        },
        success: (response) => {
          $('#task' + task.id).remove();
        },
      });
    });
  }

  tasks.forEach((task) => {
    taskDeleteListener(task);
  });

  $('#addTask').submit((e) => {
    e.preventDefault();
    $.ajax({
      type: 'POST',
      url: '/',
      headers: { 'accept': 'application/json' },
      data: {
        description: $('#taskDescription').val(),
      },
      success: (response) => {
        $('#taskDescription').val('');
        const taskDiv = `<div id="task${response.id}"><p>${response.description}<span id="taskDelete${response.id}"> X</span></p></div>`;
        $('.tasks').append(taskDiv);
        taskDeleteListener(response);
      },
    });
  });
});
