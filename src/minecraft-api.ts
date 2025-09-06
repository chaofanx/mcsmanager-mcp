import axios, { AxiosInstance, AxiosResponse } from 'axios';

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
  private client: AxiosInstance;
  private config: MinecraftAPIConfig;

  constructor(config: MinecraftAPIConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      params: {
        apikey: config.apiKey,
        uuid: config.uuid,
        daemonId: config.daemonId,
      },
      timeout: 30000,
    });
  }

  /**
   * 执行Minecraft服务器命令
   * @param command Minecraft服务器命令
   * @returns 是否执行成功
   */
  async executeServerCommand(command: string): Promise<boolean> {
    try {
      const response: AxiosResponse = await this.client.get('/api/protected_instance/command', {
        params: {
          command: command,
        },
      });

      if (response.status !== 200) {
        console.error(`命令执行失败，状态码: ${response.status}`);
        return false;
      }

      const resp = response.data;
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
      const response: AxiosResponse = await this.client.get('/api/protected_instance/outputlog', {
        params: {
          size: size,
        },
      });

      if (response.status !== 200) {
        console.error(`获取输出失败，状态码: ${response.status}`);
        return '';
      }

      const resp = response.data;
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
    // Axios 客户端不需要显式关闭
  }
}
