// Initialize Socket.io connection
const socket = io();

// DOM Elements
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const onlineUsersList = document.getElementById('online-users-list');
const chatRoomsList = document.getElementById('chat-rooms-list');
const currentChatTitle = document.getElementById('current-chat-title');
const fileUpload = document.getElementById('file-upload');

// Current user state
let currentUser = {
  id: 'user-' + Math.random().toString(36).substr(2, 9),
  name: 'User' + Math.floor(Math.random() * 1000)
};

// Current chat room
let currentChatId = 'general';

// Initialize connection
socket.on('connect', () => {
  console.log('Connected to server with ID:', socket.id);
  
  // Register user
  socket.emit('user-connected', currentUser);
  
  // Join default room
  socket.emit('join-room', currentChatId);
  updateChatTitle('General Chat');
});

// Handle online users list
socket.on('online-users', (users) => {
  onlineUsersList.innerHTML = users.map(user => 
    `<li class="user-item">
      <i class="fas fa-circle online-status"></i>
      ${user.name}
    </li>`
  ).join('');
});

// Handle incoming messages
socket.on('new-message', (message) => {
  const messageElement = `
    <div class="message ${message.senderId === currentUser.id ? 'sent' : 'received'}">
      <div class="message-sender">${message.senderName}</div>
      <div class="message-content">${message.content}</div>
      <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
    </div>
  `;
  messagesContainer.innerHTML += messageElement;
  scrollToBottom();
});

// Handle file uploads
fileUpload.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    // Get pre-signed URL from server
    const res = await fetch(`/api/upload-url?fileName=${file.name}&fileType=${file.type}&userId=${currentUser.id}`);
    const { url, fileKey, publicUrl } = await res.json();

    // Upload file to S3
    await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    // Send message with file attachment
    socket.emit('send-message', {
      chatId: currentChatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: `File uploaded: ${file.name}`,
      type: 'file',
      attachments: {
        fileName: file.name,
        fileUrl: publicUrl,
        fileType: file.type
      }
    });

  } catch (error) {
    console.error('File upload failed:', error);
    alert('File upload failed. Please try again.');
  }
});

// Send message handler
function sendMessage() {
  const message = messageInput.value.trim();
  if (message) {
    socket.emit('send-message', {
      chatId: currentChatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content: message,
      type: 'text'
    });
    messageInput.value = '';
  }
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Join room handler
function joinRoom(roomId, roomName) {
  socket.emit('join-room', roomId);
  currentChatId = roomId;
  updateChatTitle(roomName);
  messagesContainer.innerHTML = ''; // Clear messages
  loadMessageHistory(roomId);
}

// Load message history
async function loadMessageHistory(chatId) {
  try {
    const res = await fetch(`/api/messages?chatId=${chatId}`);
    const messages = await res.json();
    
    messages.forEach(message => {
      const messageElement = `
        <div class="message ${message.senderId === currentUser.id ? 'sent' : 'received'}">
          <div class="message-sender">${message.senderName}</div>
          <div class="message-content">${message.content}</div>
          <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
        </div>
      `;
      messagesContainer.innerHTML += messageElement;
    });
    
    scrollToBottom();
  } catch (error) {
    console.error('Failed to load message history:', error);
  }
}

// Helper functions
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateChatTitle(title) {
  currentChatTitle.textContent = title;
}

// Initialize room list (you would populate this from your server)
function initializeRoomList() {
  // Example rooms - you would get these from your server
  const rooms = [
    { id: 'general', name: 'General Chat' },
    { id: 'random', name: 'Random Chat' }
  ];
  
  chatRoomsList.innerHTML = rooms.map(room => 
    `<li class="room-item" onclick="joinRoom('${room.id}', '${room.name}')">
      <i class="fas fa-hashtag"></i>
      ${room.name}
    </li>`
  ).join('');
}

// Initialize the app
initializeRoomList();
loadMessageHistory(currentChatId);