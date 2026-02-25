# mcp-elasticsearch

Search, index, and manage documents in Elasticsearch clusters.

## Tools

| Tool | Description |
|------|-------------|
| `search` | Search documents in an Elasticsearch index. |
| `simple_search` | Simple text search across fields. |
| `get_document` | Get a document by ID. |
| `index_document` | Index (create/update) a document. |
| `list_indices` | List all indices. |
| `cluster_health` | Get cluster health status. |

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `ELASTICSEARCH_URL` | Yes | Elasticsearch URL (default: http://localhost:9200) |
| `ELASTICSEARCH_API_KEY` | Yes | Elasticsearch API key |
| `ELASTICSEARCH_USER` | Yes | Elasticsearch username |
| `ELASTICSEARCH_PASS` | Yes | Elasticsearch password |

## Installation

```bash
git clone https://github.com/PetrefiedThunder/mcp-elasticsearch.git
cd mcp-elasticsearch
npm install
npm run build
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "elasticsearch": {
      "command": "node",
      "args": ["/path/to/mcp-elasticsearch/dist/index.js"],
      "env": {
        "ELASTICSEARCH_URL": "your-elasticsearch-url",
        "ELASTICSEARCH_API_KEY": "your-elasticsearch-api-key",
        "ELASTICSEARCH_USER": "your-elasticsearch-user",
        "ELASTICSEARCH_PASS": "your-elasticsearch-pass"
      }
    }
  }
}
```

## Usage with npx

```bash
npx mcp-elasticsearch
```

## License

MIT
