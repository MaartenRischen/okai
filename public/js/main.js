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
           fetchChatHistory(); // Refresh chat history after import
        } else {
           importStatusDiv.innerHTML = `<div class="alert alert-danger">Error: ${result.message || response.statusText}</div>`;
        }
      } catch (error) {
        console.error('Error importing ChatGPT data:', error);
         importStatusDiv.innerHTML = `<div class="alert alert-danger">Client-side error during import: ${error.message}</div>`;
      }
    });
  }
  
  // Function to fetch and display recent ChatGPT messages
  async function fetchChatHistory() {
    const container = document.getElementById('chathistory-container');
    if (!container) return;
    container.innerHTML = '<div class="text-muted">Loading chat history...</div>';
    try {
      const response = await fetch('/api/chathistory');
      if (!response.ok) throw new Error('Failed to fetch chat history');
      const messages = await response.json();
      if (!messages.length) {
        container.innerHTML = '<div class="text-muted">No ChatGPT messages imported yet.</div>';
        return;
      }
      const html = messages.map(msg => `
        <div class="mb-3 p-2 border rounded bg-light">
          <div><strong>${msg.role}</strong> <span class="text-muted small">[${msg.conversationId}]</span></div>
          <div class="mb-1">${msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          <div class="text-muted small">${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'No timestamp'}</div>
        </div>
      `).join('');
      container.innerHTML = html;
    } catch (error) {
      container.innerHTML = `<div class="text-danger">Error loading chat history: ${error.message}</div>`;
    }
  }

  // Fetch chat history on page load
  fetchChatHistory();

  // Initial fetch of notes when page loads
  fetchNotes();

  // --- ChatGPT Conversations List and Full History ---
  const conversationList = document.getElementById('conversation-list');
  const fullChatCard = document.getElementById('full-chathistory-card');
  const fullChatContainer = document.getElementById('full-chathistory-container');
  const fullChatTitle = document.getElementById('full-chathistory-title');
  const closeChatBtn = document.getElementById('close-chathistory');

  async function fetchConversations() {
    if (!conversationList) return;
    conversationList.innerHTML = '<div class="text-muted">Loading conversations...</div>';
    try {
      const response = await fetch('/api/chathistory/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const conversations = await response.json();
      if (!conversations.length) {
        conversationList.innerHTML = '<div class="text-muted">No conversations found.</div>';
        return;
      }
      const html = conversations.map(conv => `
        <div class="mb-2">
          <a href="#" class="conversation-link" data-convid="${conv.conversationId}">
            <strong>${conv.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>
            <span class="text-muted small">[${conv.conversationId.slice(0, 8)}...]</span>
            <span class="text-muted small">${conv.lastMessage ? new Date(conv.lastMessage).toLocaleString() : ''}</span>
          </a>
        </div>
      `).join('');
      conversationList.innerHTML = html;
      // Add click handlers
      document.querySelectorAll('.conversation-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const convid = link.getAttribute('data-convid');
          showFullConversation(convid, link.textContent.trim());
        });
      });
    } catch (error) {
      conversationList.innerHTML = `<div class="text-danger">Error loading conversations: ${error.message}</div>`;
    }
  }

  async function showFullConversation(conversationId, title) {
    if (!fullChatCard || !fullChatContainer || !fullChatTitle) return;
    fullChatCard.style.display = '';
    fullChatTitle.textContent = title || 'Conversation';
    fullChatContainer.innerHTML = '<div class="text-muted">Loading conversation...</div>';
    try {
      const response = await fetch(`/api/chathistory/${conversationId}`);
      if (!response.ok) throw new Error('Failed to fetch conversation history');
      const messages = await response.json();
      if (!messages.length) {
        fullChatContainer.innerHTML = '<div class="text-muted">No messages in this conversation.</div>';
        return;
      }
      const html = messages.map(msg => `
        <div class="mb-3 p-2 border rounded ${msg.role === 'user' ? 'bg-white' : 'bg-light'}">
          <div><strong>${msg.role}</strong> <span class="text-muted small">${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'No timestamp'}</span></div>
          <div class="mb-1">${msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
      `).join('');
      fullChatContainer.innerHTML = html;
    } catch (error) {
      fullChatContainer.innerHTML = `<div class="text-danger">Error loading conversation: ${error.message}</div>`;
    }
  }

  if (closeChatBtn && fullChatCard) {
    closeChatBtn.addEventListener('click', () => {
      fullChatCard.style.display = 'none';
      fullChatContainer.innerHTML = '<div class="text-muted">Select a conversation to view its full history.</div>';
    });
  }

  // On page load, fetch conversations and hide full chat card
  if (fullChatCard) fullChatCard.style.display = 'none';
  fetchConversations();
}); 