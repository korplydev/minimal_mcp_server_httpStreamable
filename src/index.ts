import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import cors from 'cors';
import { encode } from '@toon-format/toon';

const app = express();
app.use(cors({ origin: '*', exposedHeaders: ['Mcp-Session-Id'] }));
app.use(express.json());

const mcpServer = new McpServer(
  { name: 'MCP Server Example ', version: '1.0.0' },
  {
    capabilities: { tools: {} } //TODO: añadir lista de herramientas disponibles
  }
);

// Función para generar productos dummy
function generarProductosDummy() {
  const productos = [];
  const nombres = ['Manzana', 'Banana', 'Fresa', 'Pera', 'Naranja', 'Uva', 'Limón', 'Kiwi', 'Mango', 'Piña'];
  const categorias = ['Fruta', 'Verdura', 'Enlatado', 'Limpieza', 'Aseo'];

  for (let i = 0; i < 20; i++) {
    productos.push({
      id: i + 1,
      nombre: nombres[i % nombres.length],
      precio: Math.round((Math.random() * 99000 + 1000) * 100) / 100,
      categoria: categorias[i % categorias.length],
      stock: Math.floor(Math.random() * 100)
    });
  }
  return productos;
}

// Registrar herramienta MCP para productos ficticios
mcpServer.registerTool(
  'productosDummy',
  {
    description: 'Devuelve 20 productos ficticios en formato TOON',
    inputSchema: z.object({})
  },
  async () => {
    const productos = generarProductosDummy();
    const toonData = encode(productos);
    return {
      content: [
        {
          type: 'text',
          text: toonData
        }
      ]
    };
  }
);

// Registrar herramienta con registerTool (sumar, restar)
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
    const toonResult = encode({ resultado });
    return {
      content: [
        {
          type: 'text',
          text: toonResult
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
    const toonResult = encode({ resultado });
    return {
      content: [
        {
          type: 'text',
          text: toonResult
        }
      ]
    };
  }
);

// Ruta normal Express
app.get('/', (req, res) => {
  res.send('MCP Server is running');
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor Express + MCP Streamable en puerto ${port}`);
});
