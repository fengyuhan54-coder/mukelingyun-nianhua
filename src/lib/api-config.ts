import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONFIG_FILE = join(process.cwd(), '.api-config.json');

// 简单的服务端配置存储
let cachedConfig: { apiToken?: string } = {};

export function loadConfig() {
  try {
    if (existsSync(CONFIG_FILE)) {
      cachedConfig = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {
    cachedConfig = {};
  }
  return cachedConfig;
}

export function saveConfig(config: { apiToken?: string }) {
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    cachedConfig = config;
  } catch (err) {
    console.error('保存配置失败:', err);
    throw err;
  }
}

export function getApiToken(): string | undefined {
  // 先尝试环境变量
  const envToken = process.env.DOUBAO_API_TOKEN || process.env.ARK_API_TOKEN;
  if (envToken) return envToken;
  
  // 再尝试配置文件
  loadConfig();
  return cachedConfig.apiToken;
}
