#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const RATE_LIMIT_MS = 100;
let last = 0;

function getConfig() {
  const url = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.ELASTICSEARCH_API_KEY) headers.Authorization = `ApiKey ${process.env.ELASTICSEARCH_API_KEY}`;
  else if (process.env.ELASTICSEARCH_USER && process.env.ELASTICSEARCH_PASS)
    headers.Authorization = `Basic ${btoa(`${process.env.ELASTICSEARCH_USER}:${process.env.ELASTICSEARCH_PASS}`)}`;
  return { url, headers };
}

async function esFetch(path: string, method = "GET", body?: any): Promise<any> {
  const now = Date.now(); if (now - last < RATE_LIMIT_MS) await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - (now - last)));
  last = Date.now();
  const { url, headers } = getConfig();
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${url}${path}`, opts);
  if (!res.ok) throw new Error(`ES ${res.status}: ${(await res.text()).slice(0, 500)}`);
  return res.json();
}

const server = new McpServer({ name: "mcp-elasticsearch", version: "1.0.0" });

server.tool("search", "Search documents in an Elasticsearch index.", {
  index: z.string(), query: z.string().describe("JSON query body (Elasticsearch Query DSL)"),
  size: z.number().min(1).max(100).default(10),
}, async ({ index, query, size }) => {
  const body = JSON.parse(query);
  body.size = size;
  const d = await esFetch(`/${index}/_search`, "POST", body);
  const hits = d.hits?.hits?.map((h: any) => ({ id: h._id, score: h._score, source: h._source }));
  return { content: [{ type: "text" as const, text: JSON.stringify({ total: d.hits?.total, hits }, null, 2) }] };
});

server.tool("simple_search", "Simple text search across fields.", {
  index: z.string(), query: z.string(), fields: z.array(z.string()).optional(),
  size: z.number().min(1).max(100).default(10),
}, async ({ index, query, fields, size }) => {
  const body: any = { size, query: { multi_match: { query } } };
  if (fields) body.query.multi_match.fields = fields;
  const d = await esFetch(`/${index}/_search`, "POST", body);
  const hits = d.hits?.hits?.map((h: any) => ({ id: h._id, score: h._score, source: h._source }));
  return { content: [{ type: "text" as const, text: JSON.stringify({ total: d.hits?.total, hits }, null, 2) }] };
});

server.tool("get_document", "Get a document by ID.", {
  index: z.string(), id: z.string(),
}, async ({ index, id }) => {
  const d = await esFetch(`/${index}/_doc/${id}`);
  return { content: [{ type: "text" as const, text: JSON.stringify({ id: d._id, found: d.found, source: d._source }, null, 2) }] };
});

server.tool("index_document", "Index (create/update) a document.", {
  index: z.string(), id: z.string().optional(), document: z.string().describe("JSON document body"),
}, async ({ index, id, document }) => {
  const path = id ? `/${index}/_doc/${id}` : `/${index}/_doc`;
  const d = await esFetch(path, id ? "PUT" : "POST", JSON.parse(document));
  return { content: [{ type: "text" as const, text: JSON.stringify({ id: d._id, result: d.result, version: d._version }, null, 2) }] };
});

server.tool("list_indices", "List all indices.", {}, async () => {
  const d = await esFetch("/_cat/indices?format=json");
  return { content: [{ type: "text" as const, text: JSON.stringify(d.map((i: any) => ({
    index: i.index, health: i.health, status: i.status, docsCount: i["docs.count"], storeSize: i["store.size"],
  })), null, 2) }] };
});

server.tool("cluster_health", "Get cluster health status.", {}, async () => {
  const d = await esFetch("/_cluster/health");
  return { content: [{ type: "text" as const, text: JSON.stringify(d, null, 2) }] };
});

async function main() { const t = new StdioServerTransport(); await server.connect(t); }
main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
