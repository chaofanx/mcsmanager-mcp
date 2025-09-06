#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MinecraftAPI, MinecraftAPIConfig } from './minecraft-api.js';

// 解析命令行参数
function parseArgs(): MinecraftAPIConfig {
  const args = process.argv.slice(2);
  const config: Partial<MinecraftAPIConfig> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case '--base-url':
        config.baseUrl = value;
        break;
      case '--api-key':
        config.apiKey = value;
        break;
      case '--uuid':
        config.uuid = value;
        break;
      case '--daemon-id':
        config.daemonId = value;
        break;
      case '--help':
      case '-h':
        console.log(`
MCSManager MCP Server

用法: mcsmanager-mcp [选项]

选项:
  --base-url <url>      MCSManager API 基础URL (必需)
  --api-key <key>       API密钥 (必需)
  --uuid <uuid>         UUID (必需)
  --daemon-id <id>      Daemon ID (必需)
  --help, -h            显示帮助信息

示例:
  mcsmanager-mcp --base-url http://localhost:23333 --api-key your-api-key --uuid your-uuid --daemon-id your-daemon-id
        `);
        process.exit(0);
        break;
      default:
        console.error(`未知参数: ${key}`);
        console.error('使用 --help 查看帮助信息');
        process.exit(1);
    }
  }

  // 验证必需参数
  const requiredFields: (keyof MinecraftAPIConfig)[] = ['baseUrl', 'apiKey', 'uuid', 'daemonId'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    console.error(`缺少必需参数: ${missingFields.join(', ')}`);
    console.error('使用 --help 查看帮助信息');
    process.exit(1);
  }

  return config as MinecraftAPIConfig;
}

// 解析配置
const config = parseArgs();

// 初始化 Minecraft API
const mcApi = new MinecraftAPI(config);

// 创建 MCP 服务器
const server = new Server(
  {
    name: 'mcsmanager-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'execute_command',
        description: '在服务器上执行Minecraft服务端命令',
        inputSchema: {
          type: 'object',
          properties: {
            cmd: {
              type: 'string',
              description: '要执行的命令',
            },
          },
          required: ['cmd'],
        },
      },
      {
        name: 'get_players',
        description: '获取Minecraft服务器当前在线玩家列表',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_server_status',
        description: '获取Minecraft服务器状态信息',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'set_weather',
        description: '设置Minecraft服务器天气',
        inputSchema: {
          type: 'object',
          properties: {
            weather: {
              type: 'string',
              description: '天气类型 (clear, rain, thunder)',
              enum: ['clear', 'rain', 'thunder'],
            },
          },
          required: ['weather'],
        },
      },
    ],
  };
});

// 注册工具处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'execute_command': {
        const { cmd } = args as { cmd: string };
        const success = await mcApi.executeServerCommand(cmd);
        return {
          content: [
            {
              type: 'text',
              text: success ? '命令执行成功' : '命令执行失败',
            },
          ],
        };
      }

      case 'get_players': {
        const players = await mcApi.getPlayers();
        return {
          content: [
            {
              type: 'text',
              text: `当前在线玩家: ${players.length > 0 ? players.join(', ') : '无'}`,
            },
          ],
        };
      }

      case 'get_server_status': {
        const status = await mcApi.getServerStatus();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      case 'set_weather': {
        const { weather } = args as { weather: string };
        const success = await mcApi.setWeather(weather);
        return {
          content: [
            {
              type: 'text',
              text: success ? `天气设置为 ${weather}` : '天气设置失败',
            },
          ],
        };
      }

      default:
        throw new Error(`未知工具: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `执行工具时发生错误: ${error}`,
        },
      ],
      isError: true,
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCSManager MCP Server 已启动');
}

// 处理进程退出
process.on('SIGINT', async () => {
  await mcApi.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mcApi.close();
  process.exit(0);
});

// 启动服务器
main().catch((error) => {
  console.error('服务器启动失败:', error);
  process.exit(1);
});
