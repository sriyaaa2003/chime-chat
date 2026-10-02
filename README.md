# Chime

A real-time chat application with chat rooms, typing indicators, message editing and file sharing. The backend is Node.js with Socket.IO and AWS services: messages are stored in DynamoDB and attachments go to S3 through presigned upload URLs.

## Features
- Multiple chat rooms with live messaging (Socket.IO), including join/leave events
- Typing indicators and message editing
- File attachments uploaded directly to S3 via presigned URLs
- Message history per room (`GET /api/messages/:room`)
- Sign-in, sign-up and account-verification pages (front-end screens; Cognito client libraries are included as dependencies)

## Tech stack
Node.js, Express 5, Socket.IO 4, AWS SDK v3 (DynamoDB, S3, Cognito, Lambda clients), vanilla HTML/CSS/JS front end.

## Project structure
| Path | Purpose |
|------|---------|
| `server.js` | Express + Socket.IO server, DynamoDB and S3 integration |
| `index.html`, `app.js`, `socket.js`, `styles.css` | Chat UI and client-side socket logic |
| `login.html`, `signup.html`, `verify.html`, `logout.html` | Auth screens (`logout.html` is the forgot-password page) |
| `mocksocket.js` | Mock socket for trying the UI without a server |

## Run locally
Requires Node.js and an AWS account with a DynamoDB table and an S3 bucket.

```bash
npm install
```
Create a `.env` file:
```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
DYNAMODB_TABLE=...
S3_BUCKET=...
PORT=3000
```
```bash
npm start
```
The server exits on start-up if any required variable is missing.

## Status
Work-in-progress prototype (June 2025). Note that `server.js` serves static files from a `public/` folder, which is not included in this repository, and the front-end files live in the repository root.
