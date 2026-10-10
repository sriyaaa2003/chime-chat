# Chime

A real-time chat app with chat rooms, typing indicators, message editing and file sharing.

## What I did
- Built a Node.js and Socket.IO backend where messages are stored in DynamoDB and files go to S3 through presigned upload URLs.
- Made multiple chat rooms with join and leave events, typing indicators and message editing.
- Added message history per room (`GET /api/messages/:room`).
- Built sign-in, sign-up and verification pages and a plain HTML/CSS/JS chat page.
- Wrote a mock socket (`mocksocket.js`) so the UI can be tried without the server.

## How it was built

| File | Purpose |
|------|---------|
| `server.js` | Express + Socket.IO server with DynamoDB and S3 |
| `index.html`, `app.js`, `socket.js`, `styles.css` | chat UI and client socket code |
| `login.html`, `signup.html`, `verify.html`, `logout.html` | auth pages |
| `mocksocket.js` | mock socket for the UI |

## Tech stack
Node.js, Express 5, Socket.IO 4, AWS SDK v3 (DynamoDB, S3, Cognito), HTML, CSS, JavaScript.
