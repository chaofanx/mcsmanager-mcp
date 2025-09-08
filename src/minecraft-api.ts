export interface MinecraftAPIConfig {
  baseUrl: string;
  apiKey: string;
  uuid: string;
  daemonId: string;
}

export interface ServerStatus {
  online_players: number;
  player_names: string[];
  status: 'online' | 'error';
}

export class MinecraftAPI {
  private config: MinecraftAPIConfig;

  constructor(config: MinecraftAPIConfig) {
    this.config = config;
  }

  /**
   * 构建请求 URL 和参数
   */
  private buildUrl(endpoint: string, params: Record<string, any> = {}): string {
    const url = new URL(endpoint, this.config.baseUrl);
    
    // 添加基础参数
    url.searchParams.set('apikey', this.config.apiKey);
    url.searchParams.set('uuid', this.config.uuid);
    url.searchParams.set('daemonId', this.config.daemonId);
    
    // 添加额外参数
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
    
    return url.toString();
  }

  /**
   * 执行 HTTP GET 请求
   */
  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = this.buildUrl(endpoint, params);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * 执行Minecraft服务器命令
   * @param command Minecraft服务器命令
   * @returns 是否执行成功
   */
  async executeServerCommand(command: string): Promise<boolean> {
    try {
      const resp = await this.makeRequest('/api/protected_instance/command', {
        command: command,
      });

      if (!resp || resp.status !== '200') {
        console.error(`命令执行失败，响应: ${JSON.stringify(resp)}`);
        return false;
      }

      console.log(`命令执行成功: ${command}`);
      return true;
    } catch (error) {
      console.error(`执行命令时发生错误: ${error}`);
      return false;
    }
  }

  /**
   * 获取Minecraft服务器输出日志
   * @param size 日志大小，如果不设置则返回所有日志
   * @returns 服务器输出
   */
  async getOutput(size: number = 500): Promise<string> {
    try {
      const resp = await this.makeRequest('/api/protected_instance/outputlog', {
        size: size,
      });

      if (!resp || resp.status !== '200') {
        console.error(`获取输出失败，响应: ${JSON.stringify(resp)}`);
        return '';
      }

      return resp.data || '';
    } catch (error) {
      console.error(`获取输出时发生错误: ${error}`);
      return '';
    }
  }

  /**
   * 获取当前在线玩家列表
   * @returns 玩家名称列表
   */
  async getPlayers(): Promise<string[]> {
    try {
      // 执行list命令
      const success = await this.executeServerCommand('/list');
      if (!success) {
        return [];
      }

      // 等待一下让命令执行完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 获取输出并解析
      const output = await this.getOutput(500);
      if (!output) {
        return [];
      }

      // 正则匹配：There are 1 of a max of 20 players online: chaofanx\r\n
      const pattern = /There are (\d+) of a max of (\d+) players online: (.+)\r\n/;
      const match = output.match(pattern);

      if (match) {
        const playerCount = parseInt(match[1]);
        const maxPlayers = parseInt(match[2]);
        const playersStr = match[3].trim();

        if (playerCount === 0) {
          return [];
        }

        // 分割玩家名称（用逗号分隔）
        const players = playersStr.split(',').map(p => p.trim()).filter(p => p);
        console.log(`当前在线玩家: ${players}`);
        return players;
      } else {
        // 如果没有匹配到，尝试其他格式
        console.warn(`无法解析玩家列表输出: ${output}`);
        return [];
      }
    } catch (error) {
      console.error(`获取玩家列表时发生错误: ${error}`);
      return [];
    }
  }

  /**
   * 设置天气
   * @param weather 天气类型 (clear, rain, thunder)
   * @returns 是否设置成功
   */
  async setWeather(weather: string): Promise<boolean> {
    if (!['clear', 'rain', 'thunder'].includes(weather)) {
      console.warn(`无效的天气类型: ${weather}`);
      return false;
    }

    return await this.executeServerCommand(`/weather ${weather}`);
  }

  /**
   * 获取服务器状态信息
   * @returns 服务器状态字典
   */
  async getServerStatus(): Promise<ServerStatus> {
    try {
      const players = await this.getPlayers();
      return {
        online_players: players.length,
        player_names: players,
        status: 'online'
      };
    } catch (error) {
      console.error(`获取服务器状态时发生错误: ${error}`);
      return {
        online_players: 0,
        player_names: [],
        status: 'error'
      };
    }
  }

  /**
   * 关闭HTTP客户端
   */
  async close(): Promise<void> {
    // Fetch API 不需要显式关闭
  }
}
