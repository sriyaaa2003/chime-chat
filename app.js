// DOM Elements
const leftToggle = document.querySelector('.left-toggle');
const rightToggle = document.querySelector('.right-toggle');
const leftSidebar = document.querySelector('.sidebar-left');
const rightSidebar = document.querySelector('.sidebar-right');
const welcomeScreen = document.querySelector('.welcome-screen');
const chatScreen = document.querySelector('.chat-screen');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages-container');
const onlineUsersList = document.getElementById('online-users-list');
const chatRoomsList = document.getElementById('chat-rooms-list');
const currentChatTitle = document.getElementById('current-chat-title');
const currentParticipants = document.getElementById('current-participants');
const createRoomBtn = document.getElementById('create-room-btn');
const fileUpload = document.getElementById('file-upload');

// App State
let currentUser = {
    id: 'user_' + Math.random().toString(36).substr(2, 8),
    name: 'User' + Math.floor(Math.random() * 1000)
};
let currentChat = null;
let onlineUsers = [];
let chatRooms = ['General', 'IOMP'];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    // Mock data for testing - remove in production
    onlineUsers = [
        { id: 'user1', name: 'Yaswanth', online: true },
        { id: 'user2', name: 'Jashitha', online: true },
        { id: 'user3', name: 'Venkat', online: false }
    ];
    
    renderOnlineUsers();
    renderChatRooms();
});

// Event Listeners
function setupEventListeners() {
    // Sidebar toggles
    leftToggle.addEventListener('click', () => {
        leftSidebar.classList.toggle('active');
        rightSidebar.classList.remove('active');
    });
    
    rightToggle.addEventListener('click', () => {
        rightSidebar.classList.toggle('active');
        leftSidebar.classList.remove('active');
        if (rightSidebar.classList.contains('active')) {
            welcomeScreen.style.display = 'none';
            chatScreen.style.display = 'flex';
        }
    });
    
    // Send message
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // File upload
    fileUpload.addEventListener('change', handleFileUpload);
    
    // Create room
    createRoomBtn.addEventListener('click', createNewRoom);
    
    // Click handlers for online users
    onlineUsersList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const userId = e.target.dataset.userId;
            const user = onlineUsers.find(u => u.id === userId);
            if (user) {
                startPrivateChat(user);
                leftSidebar.classList.remove('active');
            }
        }
    });
    
    // Click handlers for chat rooms
    chatRoomsList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const roomName = e.target.textContent;
            joinRoom(roomName);
            rightSidebar.classList.remove('active');
        }
    });
}

// Chat Functions
function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || !currentChat) return;
    
    const message = {
        chatId: currentChat.id,
        senderId: currentUser.id,
        senderName: currentUser.name,
        content: content,
        timestamp: new Date().toISOString(),
        type: 'text'
    };
    
    // In a real app, this would emit to the server
    renderMessage(message, true);
    messageInput.value = '';
    
    // Simulate received message after 1 second
    if (currentChat.type === 'private') {
        setTimeout(() => {
            const reply = {
                ...message,
                senderId: currentChat.user.id,
                senderName: currentChat.user.name,
                content: `Reply to: "${content}"`,
                timestamp: new Date().toISOString()
            };
            renderMessage(reply, false);
        }, 1000);
    }
}

function renderMessage(message, isCurrentUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="sender">${isCurrentUser ? 'You' : message.senderName}</div>
        <div class="content">${message.content}</div>
        <div class="time">${time}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function startPrivateChat(user) {
    currentChat = {
        type: 'private',
        id: `private_${currentUser.id}_${user.id}`,
        user: user,
        name: user.name
    };
    
    currentChatTitle.textContent = user.name;
    currentParticipants.textContent = `You, ${user.name}`;
    messagesContainer.innerHTML = '';
    welcomeScreen.style.display = 'none';
    chatScreen.style.display = 'flex';
    
    // In a real app, load message history here
}

function joinRoom(roomName) {
    currentChat = {
        type: 'room',
        id: `room_${roomName.toLowerCase().replace(/\s+/g, '_')}`,
        name: roomName
    };
    
    currentChatTitle.textContent = roomName;
    currentParticipants.textContent = `${onlineUsers.length} participants`;
    messagesContainer.innerHTML = '';
    welcomeScreen.style.display = 'none';
    chatScreen.style.display = 'flex';
    
    // In a real app, load message history here
}

function createNewRoom() {
    const roomName = prompt('Enter a name for the new room:');
    if (roomName && !chatRooms.includes(roomName)) {
        chatRooms.push(roomName);
        renderChatRooms();
        joinRoom(roomName);
    }
}

// User List Functions
function renderOnlineUsers() {
    onlineUsersList.innerHTML = '';
    onlineUsers.forEach(user => {
        if (user.id === currentUser.id) return;
        
        const li = document.createElement('li');
        li.textContent = user.name;
        li.dataset.userId = user.id;
        
        const statusIcon = document.createElement('i');
        statusIcon.className = `fas fa-circle ${user.online ? 'online' : 'offline'}`;
        li.prepend(statusIcon);
        
        onlineUsersList.appendChild(li);
    });
}

function renderChatRooms() {
    chatRoomsList.innerHTML = '';
    chatRooms.forEach(room => {
        const li = document.createElement('li');
        li.textContent = room;
        chatRoomsList.appendChild(li);
    });
}

// File Upload
function handleFileUpload() {
    const file = fileUpload.files[0];
    if (!file) return;
    
    // In a real app, upload to S3 here
    alert(`File "${file.name}" would be uploaded in a real app`);
    fileUpload.value = '';
}