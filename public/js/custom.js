/**
 *
 * You can write your JS code here, DO NOT touch the default style file
 * because it will make it harder for you to update.
 * 
 */

"use strict";


function toggleTaskCompletion(taskId) {
    const checkbox = document.getElementById(`checkbox-${taskId}`);
    const row = checkbox.closest('tr');

    if (checkbox.checked) {
      row.classList.add('completed-task');
      // Move the row to the bottom of the table
      row.parentElement.appendChild(row);
    } else {
      row.classList.remove('completed-task');
      // Move the row to the top of the table (or wherever it should be)
      const tableBody = row.parentElement;
      tableBody.insertBefore(row, tableBody.firstChild);
    }
}

