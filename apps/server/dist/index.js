import Fastify from 'fastify';
import { WebSocketServer, WebSocket } from 'ws';
import { env } from './env.js';
import { verifyAccessToken } from './jwt.js';
import { ClientMessageSchema, } from './protocol.js';
import { addClientToRoom, broadcastRoomState, checkAndBroadcastRoundStart, getRoom, getSeatedPlayerIds, removeClientFromRoom, setPlayerReady, } from './rooms.js';
import { createDeck, shuffle, dealHands, determineStarter, } from '../../../packages/rules/src/index.js';
const app = Fastify({
    logger: true,
});
// HTTP: Health check endpoint
app.get('/health', async () => {
    return { ok: true };
});
// WebSocket server
const wss = new WebSocketServer({ noServer: true });
// Track authenticated connections
const authenticated = new WeakMap();
/**
 * Deal cards and send DEALT messages to each client after ROUND_START
 */
async function dealAndSendCards(roomId) {
    const room = getRoom(roomId);
    if (!room) {
        app.log.warn(`Room not found for dealing: ${roomId}`);
        return;
    }
    // Get seated players (all connected players, max 4)
    const seatedPlayerIds = getSeatedPlayerIds(roomId, 4);
    if (seatedPlayerIds.length < 2) {
        app.log.warn(`Not enough players to deal: ${roomId}, players=${seatedPlayerIds.length}`);
        return;
    }
    // Create and shuffle deck
    let deck = createDeck();
    deck = shuffle(deck);
    // Deal hands
    const { hands } = dealHands(seatedPlayerIds, deck);
    // Determine starter
    // MVP: queue is empty, previous winner is room owner
    const queueExists = false;
    const previousWinnerPlayerId = room.ownerPlayerId || seatedPlayerIds[0];
    const starter = determineStarter({
        hands,
        seatedPlayerIds,
        queueExists,
        previousWinnerPlayerId,
    });
    app.log.info(`Dealt cards: roomId=${roomId}, starter=${starter.starterPlayerId}, reason=${starter.reason}`);
    // Send DEALT message to each client with their own hand
    for (const client of room.clients) {
        if (client.readyState !== WebSocket.OPEN) {
            continue;
        }
        const authData = authenticated.get(client);
        if (!authData) {
            continue;
        }
        const playerId = authData.playerId;
        const playerHand = hands[playerId];
        if (!playerHand) {
            // Player not in seated list, skip
            continue;
        }
        // Convert rules Card to protocol Card
        const yourHand = playerHand.map((card) => ({
            rank: card.rank,
            suit: card.suit,
        }));
        const dealtMessage = {
            type: 'DEALT',
            roomId,
            starterPlayerId: starter.starterPlayerId,
            reason: starter.reason,
            yourHand,
            seatedPlayerIds,
        };
        client.send(JSON.stringify(dealtMessage));
    }
}
wss.on('connection', (ws) => {
    let authenticatedData;
    ws.on('message', async (data) => {
        try {
            const rawMessage = JSON.parse(data.toString());
            const parseResult = ClientMessageSchema.safeParse(rawMessage);
            if (!parseResult.success) {
                const errorMessage = {
                    type: 'ERROR',
                    code: 'INVALID_MESSAGE',
                    message: parseResult.error.message,
                };
                ws.send(JSON.stringify(errorMessage));
                return;
            }
            const message = parseResult.data;
            // Handle PING
            if (message.type === 'PING') {
                // PONG is implicit - just don't error
                return;
            }
            // Handle HELLO
            if (message.type === 'HELLO') {
                // If already authenticated, ignore
                if (authenticatedData) {
                    return;
                }
                try {
                    const { playerId } = await verifyAccessToken(message.accessToken);
                    authenticatedData = {
                        roomId: message.roomId,
                        playerId,
                    };
                    authenticated.set(ws, authenticatedData);
                    // Add to room (ensures player exists with isReady=false if new)
                    addClientToRoom(message.roomId, ws, playerId);
                    // Send WELCOME
                    const welcomeMessage = {
                        type: 'WELCOME',
                        roomId: message.roomId,
                        playerId,
                    };
                    ws.send(JSON.stringify(welcomeMessage));
                    // Broadcast ROOM_STATE immediately (replaces old STATE format)
                    const count = broadcastRoomState(message.roomId);
                    app.log.info(`ROOM_STATE broadcast: roomId=${message.roomId}, count=${count}`);
                }
                catch (error) {
                    const errorMessage = {
                        type: 'ERROR',
                        code: 'AUTH_INVALID',
                        message: error instanceof Error ? error.message : 'Invalid access token',
                    };
                    ws.send(JSON.stringify(errorMessage));
                    ws.close();
                    return;
                }
                return;
            }
            // Handle READY
            if (message.type === 'READY') {
                // Must be authenticated first
                if (!authenticatedData) {
                    const errorMessage = {
                        type: 'ERROR',
                        code: 'NOT_AUTHENTICATED',
                        message: 'Must send HELLO first',
                    };
                    ws.send(JSON.stringify(errorMessage));
                    return;
                }
                // Verify roomId matches authenticated room
                if (message.roomId !== authenticatedData.roomId) {
                    const errorMessage = {
                        type: 'ERROR',
                        code: 'INVALID_ROOM',
                        message: 'Room ID does not match authenticated room',
                    };
                    ws.send(JSON.stringify(errorMessage));
                    return;
                }
                // Update player ready state
                setPlayerReady(message.roomId, authenticatedData.playerId, message.isReady);
                app.log.info(`READY received: roomId=${message.roomId}, playerId=${authenticatedData.playerId}, isReady=${message.isReady}`);
                // Broadcast ROOM_STATE
                const count = broadcastRoomState(message.roomId);
                app.log.info(`ROOM_STATE broadcast: roomId=${message.roomId}, count=${count}`);
                // Check if all players are ready and >=2 players, then broadcast ROUND_START
                const started = checkAndBroadcastRoundStart(message.roomId);
                if (started) {
                    app.log.info(`ROUND_START broadcast: roomId=${message.roomId}`);
                    // Deal cards and send DEALT messages
                    await dealAndSendCards(message.roomId);
                }
                return;
            }
            // Unknown message type (shouldn't happen due to Zod, but handle gracefully)
            const errorMessage = {
                type: 'ERROR',
                code: 'UNKNOWN_MESSAGE',
                message: 'Unknown message type',
            };
            ws.send(JSON.stringify(errorMessage));
        }
        catch (error) {
            // JSON parse error or other unexpected error
            const errorMessage = {
                type: 'ERROR',
                code: 'INVALID_MESSAGE',
                message: error instanceof Error ? error.message : 'Invalid message format',
            };
            ws.send(JSON.stringify(errorMessage));
        }
    });
    ws.on('close', () => {
        authenticatedData = authenticated.get(ws);
        if (authenticatedData) {
            removeClientFromRoom(authenticatedData.roomId, ws, authenticatedData.playerId);
            broadcastRoomState(authenticatedData.roomId);
            authenticated.delete(ws);
        }
    });
});
// Upgrade HTTP to WebSocket
app.server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '/', `http://${request.headers.host}`).pathname;
    if (pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    }
    else {
        socket.destroy();
    }
});
// Start server
const start = async () => {
    try {
        await app.listen({ port: env.PORT, host: '0.0.0.0' });
        console.log(`Server listening on http://0.0.0.0:${env.PORT}`);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map