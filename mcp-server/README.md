# HelloCare MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that lets any LLM client interact with your HelloCare health data through chat. Create health notes, manage action items, review doctor visit sessions, and more — all via natural language.

## Available Tools

| Tool                  | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `list_health_notes`   | List health notes (optionally filter by type)        |
| `create_health_note`  | Create a new health note from a description          |
| `list_action_items`   | List action items (filter by status, priority, type) |
| `create_action_item`  | Create an action item (medication, exercise, etc.)   |
| `update_action_item`  | Update status, priority, or other fields             |
| `list_sessions`       | List doctor visit session summaries                  |
| `get_session_details` | Get full session details with action items           |
| `get_user_profile`    | Get user profile information                         |
| `get_health_summary`  | Get a comprehensive health data overview             |

## Setup

### 1. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. Project Settings → Service Accounts
3. Click **Generate New Private Key**
4. Save the JSON file as `service-account-key.json` in this directory

### 2. Find Your User ID

1. Go to Firebase Console → Authentication → Users
2. Copy the **UID** for your account

### 3. Install Dependencies

```bash
cd mcp-server
npm install
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:

- `GOOGLE_APPLICATION_CREDENTIALS` — path to your service account key
- `HELLOCARE_USER_ID` — your Firebase Auth UID

### 5. Add to Cursor

Add this to your Cursor MCP settings (`.cursor/mcp.json` in the project root):

```json
{
  "mcpServers": {
    "hellocare": {
      "command": "npx",
      "args": ["tsx", "mcp-server/src/index.ts"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "./mcp-server/service-account-key.json",
        "HELLOCARE_USER_ID": "your-firebase-uid-here"
      }
    }
  }
}
```

### Alternative: Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hellocare": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/HelloCare/mcp-server/src/index.ts"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/absolute/path/to/service-account-key.json",
        "HELLOCARE_USER_ID": "your-firebase-uid-here"
      }
    }
  }
}
```

## Example Conversations

Once configured, you can say things like:

- _"Show me my recent health notes"_
- _"Create a health note: I've been having recurring lower back pain for the past 3 days"_
- _"What action items do I have pending?"_
- _"Add a medication reminder: take 500mg Ibuprofen twice daily for a week"_
- _"Mark my physical therapy action item as done"_
- _"Give me a summary of my health data"_
- _"What happened in my last doctor visit?"_

## Development

```bash
# Run in dev mode (auto-reloads)
npm run dev

# Build to JavaScript
npm run build

# Run built version
npm start
```
