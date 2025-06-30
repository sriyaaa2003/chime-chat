// Mock Socket.io functionality
const mockSocket = {
  on: (event, callback) => {
    if (event === 'connect') {
      setTimeout(callback, 300); // Simulate connection
    }
  },
  emit: (event, data) => {
    console.log("Mock socket:", event, data);
    
    // Simulate received messages
    if (event === 'send-message') {
      setTimeout(() => {
        const mockReply = {
          ...data,
          senderId: 'bot_' + Math.random().toString(36).substr(2, 4),
          senderName: 'Bot',
          content: `Reply to: "${data.content}"`,
          timestamp: new Date().toISOString()
        };
        
        // Trigger message display
        if (window.renderMessage) {
          window.renderMessage(mockReply, false);
        }
      }, 1000);
    }
  }
};

// Replace real socket.io
window.io = () => mockSocket;