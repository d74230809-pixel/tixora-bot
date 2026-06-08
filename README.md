# Tixora Bot

Discord ticket bot built with discord.js v14 + TypeScript. Hosted on Railway.

## Setup

### 1. Discord Developer Portal
1. Go to https://discord.com/developers/applications
2. Create a new application named **Tixora**
3. Go to **Bot** tab → Reset Token → copy `DISCORD_TOKEN`
4. Copy the **Application ID** as `DISCORD_CLIENT_ID`
5. Enable **Privileged Gateway Intents**: Server Members Intent, Message Content Intent
6. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Administrator` (or select specific: Manage Channels, Send Messages, Embed Links, Attach Files, Read Message History, Manage Roles, View Channel)
7. Copy the generated invite URL to invite the bot to your server

### 2. NVIDIA NIM API (Free AI)
1. Go to https://build.nvidia.com
2. Sign up / log in
3. Go to API Keys → Generate Key
4. Copy as `NVIDIA_API_KEY`

### 3. Railway Environment Variables
Set these in your Railway service:

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Your bot token |
| `DISCORD_CLIENT_ID` | Your application/client ID |
| `SUPABASE_URL` | `https://kbhhuectbfyprebpvimc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API → service_role key |
| `NVIDIA_API_KEY` | From build.nvidia.com |
| `DASHBOARD_BASE_URL` | Your Railway web app URL (e.g. https://tixora-web.up.railway.app) |
| `NODE_ENV` | `production` |

### 4. Register Slash Commands
After deploying, run once:
```bash
npm run register
```

## Commands

| Command | Prefix | Description |
|---|---|---|
| `/ping` / `T!ping` | — | Check bot latency |
| `/setup` / `T!setup` | Admin | Get dashboard link |
| `/close [reason]` / `T!close` | Staff/Opener | Close ticket |
| `/claim` / `T!claim` | Staff | Claim ticket |
| `/unclaim` / `T!unclaim` | Staff | Release claim |
| `/add @user` / `T!add @user` | Staff | Add member to ticket |
| `/remove @user` / `T!remove @user` | Staff | Remove member from ticket |
| `/reopen` / `T!reopen` | Staff | Reopen closed ticket |
| `/priority <name>` / `T!priority <name>` | Staff | Set ticket priority |
| `/tag add/remove <name>` / `T!tag add/remove <name>` | Staff | Tag a ticket |
| `/blacklist add/remove/check @user` / `T!blacklist` | Admin | Manage blacklist |

## How Panels Work
Configure panels from the web dashboard. Each panel posts a message with buttons to a channel. When a user clicks a button, Tixora opens a ticket channel and logs everything to the database.
