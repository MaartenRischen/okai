document.addEventListener('DOMContentLoaded', () => {
  // Form submission handler
  const noteForm = document.getElementById('note-form');
  if (noteForm) {
    noteForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      const contentInput = document.getElementById('note-content');
      const content = contentInput.value.trim();
      
      if (!content) return;
      
      try {
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content }),
        });
        
        if (response.ok) {
          // Clear the input field
          contentInput.value = '';
          
          // Refresh the notes list
          fetchNotes();
        } else {
          console.error('Failed to save note');
        }
      } catch (error) {
        console.error('Error saving note:', error);
      }
    });
  }
  
  // Refresh button handler
  const refreshButton = document.getElementById('refresh-notes');
  if (refreshButton) {
    refreshButton.addEventListener('click', fetchNotes);
  }
  
  // Function to fetch and display notes
  async function fetchNotes() {
    try {
      const response = await fetch('/api/notes');
      const notes = await response.json();
      
      const notesContainer = document.getElementById('notes-container');
      
      if (notes.length === 0) {
        notesContainer.innerHTML = '<p class="text-center text-muted">No notes yet. Add your first note!</p>';
        return;
      }
      
      // Sort notes by creation date (newest first)
      notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Generate HTML for each note
      const notesHTML = notes.map(note => `
        <div class="note-card mb-3 p-3 border rounded">
          <p class="note-content mb-2">${note.content}</p>
          <small class="text-muted">
            ${new Date(note.createdAt).toLocaleString()}
          </small>
        </div>
      `).join('');
      
      notesContainer.innerHTML = notesHTML;
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  }

  // ChatGPT Import Form Handler
  const chatgptImportForm = document.getElementById('chatgpt-import-form');
  const importStatusDiv = document.getElementById('import-status');

  if (chatgptImportForm) {
    chatgptImportForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      importStatusDiv.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div> Importing...';
      
      const fileInput = document.getElementById('chatgptFile');
      if (!fileInput.files || fileInput.files.length === 0) {
        importStatusDiv.textContent = 'Please select a file.';
        return;
      }
      
      const formData = new FormData();
      formData.append('chatgptFile', fileInput.files[0]);
      
      try {
        const response = await fetch('/api/import/chatgpt', {
          method: 'POST',
          // No Content-Type header needed; browser sets it for FormData
          body: formData,
        });
        
        const result = await response.json();

        if (response.ok) {
          let statusMessage = `<div class="alert alert-success">${result.message}</div>`;
          if (result.errors && result.errors.length > 0) {
            statusMessage += `<div class="alert alert-warning mt-2">Errors during import:<br>${result.errors.join('<br>')}</div>`;
          }
           importStatusDiv.innerHTML = statusMessage;
        } else {
           importStatusDiv.innerHTML = `<div class="alert alert-danger">Error: ${result.message || response.statusText}</div>`;
        }
      } catch (error) {
        console.error('Error importing ChatGPT data:', error);
         importStatusDiv.innerHTML = `<div class="alert alert-danger">Client-side error during import: ${error.message}</div>`;
      }
    });
  }
  
  // Initial fetch of notes when page loads
  fetchNotes();
}); 