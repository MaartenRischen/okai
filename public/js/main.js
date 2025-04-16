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

  // --- Sidebar, Grouping, and Chat View Logic ---
  const folderList = document.getElementById('folder-list');
  const groupedConversationList = document.getElementById('grouped-conversation-list');
  let allConversations = [];
  let currentFolder = 'all';

  function getFolderName(folder) {
    return folder || 'Unfiled';
  }

  function groupByDate(conversations) {
    const now = new Date();
    const groups = { 'Previous 7 Days': [], 'Previous 30 Days': [], 'Older': [] };
    conversations.forEach(conv => {
      const last = conv.lastMessage ? new Date(conv.lastMessage) : null;
      if (!last) {
        groups['Older'].push(conv);
        return;
      }
      const diffDays = (now - last) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7) {
        groups['Previous 7 Days'].push(conv);
      } else if (diffDays <= 30) {
        groups['Previous 30 Days'].push(conv);
      } else {
        groups['Older'].push(conv);
      }
    });
    return groups;
  }

  function renderSidebar(conversations) {
    if (!folderList) return;
    // Get unique folders
    const folders = Array.from(new Set(conversations.map(c => getFolderName(c.folder))));
    folderList.innerHTML = '<li class="nav-item"><a class="nav-link' + (currentFolder === 'all' ? ' active' : '') + '" href="#" data-folder="all">All Conversations</a></li>' +
      folders.map(folder => `<li class="nav-item"><a class="nav-link${currentFolder === folder ? ' active' : ''}" href="#" data-folder="${folder}">${folder}</a></li>`).join('');
    // Add click handlers
    folderList.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        currentFolder = link.getAttribute('data-folder');
        renderSidebar(conversations);
        renderGroupedConversations();
      });
    });
  }

  function renderGroupedConversations() {
    if (!groupedConversationList) return;
    let filtered = allConversations;
    if (currentFolder !== 'all') {
      filtered = filtered.filter(c => getFolderName(c.folder) === currentFolder);
    }
    const groups = groupByDate(filtered);
    let html = '';
    Object.entries(groups).forEach(([group, convs]) => {
      if (!convs.length) return;
      html += `<h6 class="mt-4 mb-2">${group}</h6>`;
      html += convs.map(conv => `
        <div class="mb-2">
          <a href="#" class="conversation-link" data-convid="${conv.conversationId}">
            <strong>${conv.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>
            <span class="text-muted small">[${conv.conversationId.slice(0, 8)}...]</span>
            <span class="text-muted small">${conv.lastMessage ? new Date(conv.lastMessage).toLocaleString() : ''}</span>
          </a>
        </div>
      `).join('');
    });
    groupedConversationList.innerHTML = html || '<div class="text-muted">No conversations found.</div>';
    // Add click handlers
    groupedConversationList.querySelectorAll('.conversation-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const convid = link.getAttribute('data-convid');
        showFullConversation(convid, link.textContent.trim());
      });
    });
  }

  async function fetchAndRenderConversations() {
    try {
      const response = await fetch('/api/chathistory/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      allConversations = await response.json();
      renderSidebar(allConversations);
      renderGroupedConversations();
    } catch (error) {
      groupedConversationList.innerHTML = `<div class="text-danger">Error loading conversations: ${error.message}</div>`;
    }
  }

  // Improved chat view with bubbles, avatars, alignment
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
        <div class="d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}">
          ${msg.role === 'assistant' ? '<div class="me-2"><span class="avatar bg-primary text-white rounded-circle p-2">A</span></div>' : ''}
          <div class="chat-bubble ${msg.role === 'user' ? 'user-bubble bg-info text-white' : 'assistant-bubble bg-light border'}">
            <div class="mb-1">${msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <div class="text-muted small text-end">${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'No timestamp'}</div>
          </div>
          ${msg.role === 'user' ? '<div class="ms-2"><span class="avatar bg-secondary text-white rounded-circle p-2">U</span></div>' : ''}
        </div>
      `).join('');
      fullChatContainer.innerHTML = `<div class="p-3">${html}</div>`;
      fullChatContainer.scrollTop = fullChatContainer.scrollHeight;
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
  fetchAndRenderConversations();
}); 