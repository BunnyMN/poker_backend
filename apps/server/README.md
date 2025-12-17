# Poker Game Server

Realtime multiplayer game server built with Node.js 20, TypeScript, Fastify, and WebSocket.

## Setup

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

2. Set your Supabase JWT secret in `.env`:
   ```
   SUPABASE_JWT_SECRET=your-actual-supabase-jwt-secret
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:4000` (or the port specified in `.env`).

## Scripts

- `npm run dev` - Start development server with hot reload (tsx watch)
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run the production build

## API

### HTTP Endpoints

- `GET /health` - Health check endpoint
  - Response: `{ "ok": true }`

### WebSocket Endpoint

- `WS /ws` - WebSocket connection for realtime game communication

## Protocol

### Client -> Server Messages

#### HELLO
Join a room with authentication.

```json
{
  "type": "HELLO",
  "roomId": "room-123",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### PING
Keep-alive message.

```json
{
  "type": "PING"
}
```

### Server -> Client Messages

#### WELCOME
Sent after successful HELLO authentication.

```json
{
  "type": "WELCOME",
  "roomId": "room-123",
  "playerId": "user-uuid"
}
```

#### STATE
Broadcast to all clients in a room when players join/leave.

```json
{
  "type": "STATE",
  "roomId": "room-123",
  "players": ["user-uuid-1", "user-uuid-2"]
}
```

#### ERROR
Error response for invalid messages or authentication failures.

```json
{
  "type": "ERROR",
  "code": "AUTH_INVALID",
  "message": "Invalid access token"
}
```

Error codes:
- `AUTH_INVALID` - Invalid or missing access token
- `INVALID_MESSAGE` - Message doesn't match protocol schema
- `UNKNOWN_MESSAGE` - Unknown message type

## Example WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:4000/ws');

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'HELLO',
    roomId: 'room-123',
    accessToken: 'your-supabase-jwt-token'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received:', message);
});
```

