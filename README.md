# MidRun

Real-time multiplayer crash betting game on Midnight Network. Players connect their Lace wallet, bet NIGHT tokens, watch a multiplier climb, and cash out before the crash. Game results land on-chain through a Compact smart contract.

> **Status:** WebSocket game engine + client + Compact contract are deployed and working. The `ws` server currently runs in **demo mode** — wallet-backed on-chain payouts and `saveToDB` contract calls are stubbed. **Going to be implemented in the next milestone.**

## Components

| Path | Role |
|---|---|
| [client/](client/) | Next.js 15 frontend — Lace wallet connect, bet placement, live multiplier UI |
| [ws/](ws/) | Bun + Hono WebSocket server — game state machine, multiplier ticker, broadcasts |
| [ws/contract/midrun_contract/CrashGame.compact](ws/contract/midrun_contract/CrashGame.compact) | On-chain game result ledger + `setGameData` circuit |
| [docker-compose.yml](docker-compose.yml) | Proof server + ws bundle |
| [indexer-proxy.js](indexer-proxy.js) | Local HTTP/WS proxy rewriting `/api/v4/` → `/api/v3/` for SDK compatibility |

## Prerequisites

- [Bun](https://bun.sh) 1.x
- Node.js 22+ (client)
- Docker + Docker Compose (proof server)
- Midnight Lace browser extension
- tNIGHT from the [preprod faucet](https://faucet.preprod.midnight.network/)

## Running with Docker

Brings up the preprod proof server and the ws backend:

```bash
docker compose up --build
```

Services:

| Service | Port | Image / Build |
|---|---|---|
| `proof-server` | `6300` | `midnightntwrk/proof-server:latest` |
| `ws` | `3001` | `./ws/Dockerfile` (Bun 1 + Hono) |

The `ws` container reads [ws/.env](ws/.env) and overrides `MIDNIGHT_PROOF_SERVER_URL` to `http://proof-server:6300`.

Verify:
```bash
curl http://localhost:3001/        # → "Game WebSocket Server Running!"
curl http://localhost:3001/game/state
```

## Running without Docker

### 1. WebSocket server

```bash
cd ws
bun install
bun run dev     # hot-reload on :3001
```

### 2. Client

```bash
cd client
bun install
bun dev         # Next.js on :3000 (turbopack)
```

### 3. (Only if wiring on-chain) Proof server

```bash
docker run -d --name midnight-proof-server \
  -p 6300:6300 \
  midnightntwrk/proof-server:latest \
  midnight-proof-server -v
```

### 4. (Only if wiring on-chain) Wallet + contract

```bash
cd ws
bun run generate-wallet   # writes seed, prints address → fund via faucet
bun run compile           # compact compile CrashGame.compact → contract/compiled
bun run deploy            # deploys to preprod, writes deployment.json
```

Current `deployment.json`:
```json
{
  "contractAddress": "23dc9049844987be56c5f307d3c92a2bb1850c504019ae8facd4abeff4aa7a81",
  "network": "preprod"
}
```

### Environment

`ws/.env`:
```env
MIDNIGHT_WALLET_SEED="<64-char hex>"
MIDNIGHT_CONTRACT_ADDRESS="23dc90..."
MIDNIGHT_RPC_URL="https://rpc.preprod.midnight.network"
MIDNIGHT_INDEXER_URL="https://indexer.preprod.midnight.network/api/v4/graphql"
MIDNIGHT_INDEXER_WS_URL="wss://indexer.preprod.midnight.network/api/v4/graphql/ws"
MIDNIGHT_PROOF_SERVER_URL="http://localhost:6300"
```

`client/.env.local`:
```env
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_GAME_RECEIVER_ADDRESS=mn_addr_preprod1...
```

## CLI / WebSocket testing

Full scenario doc: [ws/TESTING_GUIDE.md](ws/TESTING_GUIDE.md). Quick version using `websocat` or Postman WebSocket requests:

### 1. Health + state
```bash
curl http://localhost:3001/
curl http://localhost:3001/game/state
```

### 2. Connect to WS
```
ws://localhost:3001/ws
```
On connect the server pushes `{ type: "game_state", data: {...} }`.

### 3. Join a game (during waiting phase)
```json
{"type":"join_game","address":"player1","amount":100}
```
→ `{ "type":"join_result", "success":true, "message":"Joined game successfully" }`
Broadcast to all: `player_joined`.

### 4. Wait for start (15s waiting phase)
Broadcast: `game_started`, then a stream of `multiplier_update` events while the multiplier climbs.

### 5. Withdraw before crash
```json
{"type":"withdraw","address":"player1"}
```
→ `{ "type":"withdraw_result", "success":true, "payout":<stake*multiplier> }`

### 6. Crash + cycle
Broadcast: `game_ended` with `crashAt`, then `waiting_phase` after 2s.

### 7. Current multiplier on demand
```json
{"type":"get_multiplier"}
```
→ `{ "type":"current_multiplier", "multiplier": 1.23 }`

### 8. Run backend tests
```bash
cd ws
bun test
```
Covers `game-manager` phase transitions and `game-functions` payout math.

## What works

- [x] GameManager state machine (`waiting` → `running` → `ended` → `waiting`)
- [x] HMAC-based provably-fair crash point generation
- [x] Multiplier progression with accelerating intervals (10s for 1–2x, halving per band)
- [x] Player queue for bets placed during an active round (auto-enter next round)
- [x] Hono WebSocket server with all event broadcasts (`join_game`, `withdraw`, `multiplier_update`, `game_ended`, etc.)
- [x] Next.js client with Lace DApp connector, wallet state (shielded / unshielded / DUST balances), Bech32m address display
- [x] Bet placement from client via `connectedApi.makeTransfer()` (unshielded NIGHT → receiver address)
- [x] CrashGame Compact contract compiled + deployed to preprod
- [x] Dockerized proof server + ws
- [x] Bun test suite for game-manager and game-functions
- [x] `indexer-proxy.js` for v4 → v3 GraphQL compatibility during debugging

## What's not yet wired (next milestone)

The following are **going to be implemented in the next milestone**:

- **`ws` demo mode** — [ws/src/game-functions.ts](ws/src/game-functions.ts) currently stubs wallet + contract calls. `initWalletBackground()` is a no-op, `getWallet()` throws, and `withdraw()` returns the computed payout without submitting an on-chain transfer. `saveToDB()` only `console.log`s.
- **Server-side WalletFacade** — BIP-44 `m/44'/2400'/0'` HD derivation from `MIDNIGHT_WALLET_SEED`, DUST registration, `transferTransaction` → `signRecipe` → `finalizeRecipe` → `submitTransaction` pipeline for real NIGHT payouts to winners.
- **`setGameData` circuit call** — contract is deployed (`23dc9049...`), but `ws` never invokes `setGameData(gameId, crashAt, date)`. `latestGameId`, `latestCrashAt`, `latestDate`, and `gameCount` stay at whatever they were at deploy time.
- **Signed bet verification** — `ws` accepts `join_game` with only an address + amount; there is no verification that the client actually submitted the matching on-chain transfer. `transactionId` field is plumbed but not checked.
- **Production wallet + contract address** — current `.env` ships with a dev seed, rotate before any real deployment.
- **Frontend component tests** — `client/` has no test suite yet.

## Network endpoints (preprod)

| | URL |
|---|---|
| RPC | `https://rpc.preprod.midnight.network` |
| Indexer (HTTP) | `https://indexer.preprod.midnight.network/api/v4/graphql` |
| Indexer (WS) | `wss://indexer.preprod.midnight.network/api/v4/graphql/ws` |
| Proof server (local) | `http://localhost:6300` |
| Faucet | `https://faucet.preprod.midnight.network/` |

## Layout

```
midrun/
├── client/             # Next.js 15 frontend (Lace connector)
├── ws/                 # Bun + Hono ws server, game engine, contract
│   ├── src/            # game-manager, game-functions, deploy, tests
│   ├── contract/       # CrashGame.compact + compiled artifacts
│   ├── Dockerfile
│   └── deployment.json
├── docker-compose.yml  # proof-server + ws
├── indexer-proxy.js    # /api/v4/ → /api/v3/ rewrite proxy
└── DETAILS.md          # project + milestone breakdown
```

## Troubleshooting

**`ws` exits on boot with "demo mode: ws wallet disabled"** — expected: demo mode is the current default. Nothing calls `getWallet()` unless you manually invoke `deploy.ts`.

**Lace wallet not detected on client** — ensure the extension is installed and the page is served over `http://localhost:3000` (Lace injects `window.midnight.mnLace` on load).

**`compact compile` not found** — install the Compact compiler (`compact` CLI) from the Midnight developer tooling. Required only for rebuilding the contract.

**Proof server unhealthy in Docker** — first boot downloads params; give it ~30s. Check `docker compose logs proof-server`.

## License

Apache-2.0 (to be confirmed)
