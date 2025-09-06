# MCSManager MCP Server

这是一个用于管理 Minecraft 服务器的 MCP (Model Context Protocol) 服务器，支持通过 npm 安装和 npx 直接执行。

## 功能特性

- 执行 Minecraft 服务器命令
- 获取在线玩家列表
- 获取服务器状态信息
- 设置服务器天气
- 通过命令行参数安全配置敏感信息

## 安装和使用

### 全局安装（推荐）

```bash
npm install -g mcsmanager-mcp
```

### 使用 npx（无需安装）

```bash
npx mcsmanager-mcp --base-url <url> --api-key <key> --uuid <uuid> --daemon-id <id>
```

### 本地开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm run dev -- --base-url <url> --api-key <key> --uuid <uuid> --daemon-id <id>

# 构建
pnpm run build

# 运行构建后的版本
pnpm start -- --base-url <url> --api-key <key> --uuid <uuid> --daemon-id <id>
```

## 配置

### 命令行参数

所有敏感信息都通过命令行参数提供，确保安全性：

```bash
mcsmanager-mcp --base-url <url> --api-key <key> --uuid <uuid> --daemon-id <id>
```

**必需参数：**
- `--base-url <url>`: MCSManager API 基础URL
- `--api-key <key>`: API密钥
- `--uuid <uuid>`: UUID
- `--daemon-id <id>`: Daemon ID

**可选参数：**
- `--help, -h`: 显示帮助信息

### 示例

```bash
# 使用 npx 运行
npx mcsmanager-mcp \
  --base-url http://localhost:23333 \
  --api-key your-api-key \
  --uuid your-uuid \
  --daemon-id your-daemon-id

# 全局安装后运行
mcsmanager-mcp \
  --base-url http://your-server:23333 \
  --api-key your-api-key \
  --uuid your-uuid \
  --daemon-id your-daemon-id
```

## 可用工具

### execute_command
执行 Minecraft 服务器命令

**参数:**
- `cmd` (string): 要执行的命令

**示例:**
```json
{
  "cmd": "/say Hello World"
}
```

### get_players
获取当前在线玩家列表

**参数:** 无

### get_server_status
获取服务器状态信息

**参数:** 无

**返回:**
```json
{
  "online_players": 2,
  "player_names": ["player1", "player2"],
  "status": "online"
}
```

### set_weather
设置服务器天气

**参数:**
- `weather` (string): 天气类型，可选值: "clear", "rain", "thunder"

**示例:**
```json
{
  "weather": "rain"
}
```

## 发布到 npm

### 发布前准备

1. 确保你已经登录到 npm：
```bash
npm login
```

2. 更新版本号（如果需要）：
```bash
npm version patch  # 或 minor, major
```

3. 构建项目：
```bash
pnpm run build
```

### 发布

```bash
npm publish
```

### 发布到测试环境（可选）

```bash
npm publish --tag beta
```

## 许可证

MIT
