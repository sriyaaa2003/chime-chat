require('dotenv').config();

// Validate environment variables
const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'DYNAMODB_TABLE', 'S3_BUCKET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Initialize Express and other setup remains the same
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

const io = socketio(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? ['https://yourdomain.com'] : '*',
        methods: ['GET', 'POST']
    },
    connectionStateRecovery: {
        maxDisconnectionDuration: 120000
    }
});

// AWS Configuration and other constants remain the same
const awsConfig = {
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
};

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient(awsConfig));
const s3 = new S3Client(awsConfig);

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'ChatMessages';
const BUCKET_NAME = process.env.S3_BUCKET;
const DEFAULT_ROOMS = ['general', 'random'];
const activeUsers = new Map();

// API Endpoints
app.get('/api/upload-url', async (req, res) => {
    try {
        const { fileName, fileType, userId } = req.query;
        if (!fileName || !fileType || !userId) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const fileKey = `uploads/${userId}/${Date.now()}-${path.basename(fileName)}`;
        
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileKey,
            ContentType: fileType,
            ACL: 'public-read'
        });
        
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        
        res.json({
            url,
            fileKey,
            publicUrl: `https://${BUCKET_NAME}.s3.${awsConfig.region}.amazonaws.com/${fileKey}`
        });
    } catch (err) {
        console.error('Upload URL error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/messages/:room', async (req, res) => {
    try {
        const result = await dynamodb.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'chatId = :chatId',
            ExpressionAttributeValues: {
                ':chatId': req.params.room
            },
            Limit: 50,
            ScanIndexForward: false,
            ConsistentRead: false // Use eventual consistency
        }));
        
        res.json(result.Items || []);
    } catch (err) {
        console.error('Fetch messages error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Socket.io Connection Handling
io.on('connection', (socket) => {
    console.log(`New connection: ${socket.id}`);

    socket.on('register', (userData, callback) => {
        try {
            if (!userData?.name) {
                throw new Error('Name is required');
            }

            const user = {
                id: userData.id || `user_${Math.random().toString(36).slice(2, 10)}`,
                name: userData.name.trim(),
                avatar: userData.avatar || `https://i.pravatar.cc/150?u=${userData.id || Date.now()}`,
                socketId: socket.id,
                status: 'online',
                lastActive: new Date().toISOString()
            };
            
            if (user.name.length > 30) {
                throw new Error('Name must be less than 30 characters');
            }
            
            socket.userId = user.id;
            socket.user = user;
            
            activeUsers.set(user.id, user);
            socket.join('general');
            
            console.log(`✅ User registered: ${user.name} (${user.id})`);
            
            io.emit('user-list', Array.from(activeUsers.values()));
            callback({ status: 'success', user });
        } catch (err) {
            console.error('❌ Registration error:', err);
            callback({ status: 'error', error: err.message });
        }
    });

    socket.on('send-message', async ({ room, content, type = 'text', attachments = [] }, callback) => {
        try {
            const user = activeUsers.get(socket.userId);
            if (!user) {
                throw new Error('User not registered');
            }

            if (!room || !content) {
                throw new Error('Room and content are required');
            }

            const message = {
                messageId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                chatId: room,
                senderId: user.id,
                senderName: user.name,
                senderAvatar: user.avatar,
                content: String(content).substring(0, 500),
                type,
                attachments: Array.isArray(attachments) ? attachments.slice(0, 5) : [],
                timestamp: Date.now(),
                status: 'delivered',
                edited: false
            };

            await dynamodb.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: message
            }));

            io.to(room).emit('new-message', message);
            
            callback?.({ status: 'success', message });
        } catch (err) {
            console.error('❌ Message send error:', err);
            callback?.({ status: 'error', error: err.message });
        }
    });

    socket.on('join-room', (room, callback) => {
        try {
            if (!room || typeof room !== 'string' || room.length > 50) {
                throw new Error('Valid room name is required (max 50 characters)');
            }
            
            const allowedRooms = [...DEFAULT_ROOMS, 'room1', 'room2']; // Define allowed rooms
            if (!allowedRooms.includes(room)) {
                throw new Error('Invalid room name');
            }

            Array.from(socket.rooms)
                .filter(r => !DEFAULT_ROOMS.includes(r))
                .forEach(r => socket.leave(r));
            
            socket.join(room);
            console.log(`🏠 User ${socket.userId} joined room: ${room}`);
            
            socket.to(room).emit('user-joined', {
                userId: socket.userId,
                name: socket.user?.name,
                room
            });
            
            callback?.({ status: 'success', room });
        } catch (err) {
            console.error('Join room error:', err);
            callback?.({ status: 'error', error: err.message });
        }
    });

    socket.on('leave-room', (room, callback) => {
        try {
            if (!room) {
                throw new Error('Room is required');
            }
            if (!DEFAULT_ROOMS.includes(room)) {
                socket.leave(room);
                console.log(`🚪 User ${socket.userId} left room: ${room}`);
                
                socket.to(room).emit('user-left', {
                    userId: socket.userId,
                    room
                });
                callback?.({ status: 'success' });
            }
        } catch (err) {
            console.error('Leave room error:', err);
            callback?.({ status: 'error', error: err.message });
        }
    });

    socket.on('typing', (room, callback) => {
        try {
            const user = activeUsers.get(socket.userId);
            if (!user || !room) {
                throw new Error('User or room not found');
            }
            socket.to(room).emit('user-typing', { 
                userId: user.id, 
                name: user.name,
                room 
            });
            callback?.({ status: 'success' });
        } catch (err) {
            console.error('Typing error:', err);
            callback?.({ status: 'error', error: err.message });
        }
    });

    socket.on('edit-message', async ({ messageId, newContent, room }, callback) => {
        try {
            const user = activeUsers.get(socket.userId);
            if (!user) throw new Error('Not authenticated');
            
            if (!messageId || !newContent || !room) {
                throw new Error('Missing required fields');
            }

            await dynamodb.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    chatId: room,
                    messageId: messageId
                },
                UpdateExpression: 'SET content = :content, edited = :edited, editedAt = :editedAt',
                ConditionExpression: 'senderId = :senderId',
                ExpressionAttributeValues: {
                    ':content': String(newContent).substring(0, 500),
                    ':edited': true,
                    ':editedAt': Date.now(),
                    ':senderId': user.id
                }
            }));

            io.to(room).emit('message-edited', {
                messageId,
                newContent: String(newContent).substring(0, 500),
                editedAt: Date.now()
            });
            
            callback?.({ status: 'success' });
        } catch (err) {
            console.error('Edit message error:', err);
            callback?.({ status: 'error', error: err.message });
        }
    });

    socket.on('disconnect', () => {
        const user = activeUsers.get(socket.userId);
        if (user) {
            user.status = 'offline';
            user.lastActive = new Date().toISOString();
            activeUsers.set(user.id, user);
            
            io.emit('user-list', Array.from(activeUsers.values()));
            console.log(`👋 User ${user.name} disconnected`);
            
            setTimeout(() => {
                if (!io.sockets.sockets.get(socket.id)) {
                    activeUsers.delete(user.id);
                    io.emit('user-list', Array.from(activeUsers.values()));
                }
            }, 300000);
        }
    });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket available at ws://localhost:${PORT}`);
    console.log(`DynamoDB Table: ${TABLE_NAME}`);
    console.log(`S3 Bucket: ${BUCKET_NAME}`);
});