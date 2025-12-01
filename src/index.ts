import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*', exposedHeaders: ['Mcp-Session-Id'] }));
app.use(express.json());

const mcpServer = new McpServer(
  { name: 'Minimal MCP Server', version: '1.0.0' },
  {
    capabilities: { tools: {} }
  }
);

// Registrar herramienta con registerTool (recomendado)
mcpServer.registerTool(
  'sumar',
  { 
    description: 'Suma dos números',
    inputSchema: z.object({
      a: z.number().describe('Primer número'),
      b: z.number().describe('Segundo número')
    })
  },
  async (args) => {
    const { a, b } = args;
    const resultado = a + b;
    console.log(`[TOOL] sumar ejecutada: ${a} + ${b} = ${resultado}`);
    return {
      content: [
        {
          type: 'text',
          text: `El resultado de ${a} + ${b} = ${resultado}`
        }
      ]
    };
  }
);

mcpServer.registerTool(
  'restar',
  {
    description: 'Resta dos números',
    inputSchema: z.object({
      a: z.number().describe('Primer número (minuendo)'),
      b: z.number().describe('Segundo número (sustraendo)')
    })
  },
  async (args) => {
    const { a, b } = args;
    const resultado = a - b;
    console.log(`[TOOL] restar ejecutada: ${a} - ${b} = ${resultado}`);
    return {
      content: [
        {
          type: 'text',
          text: `El resultado de ${a} - ${b} = ${resultado}`
        }
      ]
    };
  }
);

// Ruta normal Express
app.get('/', (req, res) => {
  res.send('API Express + MCP Streamable funcionando ✅');
});

// Endpoints MCP Streamable
app.post('/mcp', async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res, req.body);

  res.on('close', () => transport.close());
  res.on('finish', () => console.log('Response enviada'));
});

app.all('/mcp', (req: Request, res: Response) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
  }
});

// Iniciar el servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor Express + MCP Streamable en puerto ${port}`);
});
