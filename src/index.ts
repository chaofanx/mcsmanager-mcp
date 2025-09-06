#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
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
const server = new McpServer({
  name: 'mcsmanager-mcp',
  version: '1.0.0',
  capabilities: {
    resources: {},
    tools: {},
  }
});


// 工具函数
async function executeCommand(cmd: string): Promise<boolean> {
  const success = await mcApi.executeServerCommand(cmd) as boolean;
  return success;
}

async function getPlayers(): Promise<string[]> {
  const players = await mcApi.getPlayers() as string[];
  return players;
}

async function setWeather(weather: string): Promise<boolean> {
  const success = await mcApi.setWeather(weather) as boolean;
  return success;
}


server.tool(
  'execute_command',
  '在服务器上执行Minecraft服务端命令',
  {
    cmd: z.string().describe('要执行的命令'),
  },
  async ({ cmd }) => {
    return { content: [{ type: 'text', text: await executeCommand(cmd) ? '命令执行成功' : '命令执行失败' }] };
  }
)

server.tool(
  'get_players',
  '获取Minecraft服务器当前在线玩家列表',
  {},
  async () => {
    const players = await getPlayers();
    return { content: [{ type: 'text', text: `当前在线玩家: ${players.length > 0 ? players.join(', ') : '无'}` }] };
  }
)

server.tool(
  'set_weather',
  '设置Minecraft服务器天气',
  {
    weather: z.string().describe('天气类型 (clear, rain, thunder)'),
  },
  async ({ weather }) => {
    return { content: [{ type: 'text', text: await setWeather(weather) ? '天气设置成功' : '天气设置失败' }] };
  }
)


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
