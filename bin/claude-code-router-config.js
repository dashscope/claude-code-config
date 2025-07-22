#!/usr/bin/env node

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const readline = require("readline");

class ClaudeCodeRouterConfig {
  constructor() {
    this.homeDir = os.homedir();
    this.configDir = path.join(this.homeDir, ".claude-code-router");
    this.configFile = path.join(this.configDir, "config.json");
    this.pluginsDir = path.join(this.configDir, "plugins");
    this.transformerFile = path.join(
      this.pluginsDir,
      "dashscope-transformer.js"
    );
    this.language = this.detectLanguage();
    this.messages = this.getMessages();
  }

  detectLanguage() {
    // 检测系统语言
    const locale = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || "en_US.UTF-8";
    return locale.toLowerCase().includes('zh') ? 'zh' : 'en';
  }

  getMessages() {
    const messages = {
      zh: {
        configuring: "🚀 正在配置 claude-code-router...",
        envKeyDetected: "🔑 检测到环境变量 DASHSCOPE_API_KEY，将使用环境变量中的 API Key",
        envKeyNotFound: "⚠️  未检测到环境变量 DASHSCOPE_API_KEY，将使用默认配置",
        configComplete: "✅ claude-code-router 配置完成！",
        configLocation: "📁 配置文件位置:",
        usage: "📝 使用说明:",
        step1: "1. 请确保已安装 @anthropic-ai/claude-code",
        step2: "2. 请确保已安装 @musistudio/claude-code-router",
        step3Warning: "3. ⚠️  请手动配置环境变量DASHSCOPE_API_KEY:",
        step3Success: "3. ✅ API Key 已从环境变量自动配置",
        promptApiKey: "请输入您的 DashScope API Key:",
        apiKeyPrompt: "DashScope API Key",
        apiKeyConfigured: "✅ API Key 已配置完成",
        invalidApiKey: "❌ API Key 不能为空，请重新输入",
        step4: "4. 运行 ccr code 开始使用",
        configFailed: "❌ 配置失败:",
        createDir: "📁 创建目录:",
        createConfig: "📄 创建配置文件:",
        createPlugin: "🔧 创建插件文件:",
        editConfigInstructions: [
          `   cd `,
          `   open config.json  # macOS`,
          `   # 或者用你喜欢的编辑器打开 config.json`,
          `   # 将 "api_key" 字段替换为你的 DashScope API Key`
        ]
      },
      en: {
        configuring: "🚀 Configuring claude-code-router...",
        envKeyDetected: "🔑 DASHSCOPE_API_KEY environment variable detected, will use API Key from environment",
        envKeyNotFound: "⚠️  DASHSCOPE_API_KEY environment variable not found, will use default configuration",
        configComplete: "✅ claude-code-router configuration completed!",
        configLocation: "📁 Configuration file location:",
        usage: "📝 Usage instructions:",
        step1: "1. Please ensure @anthropic-ai/claude-code is installed",
        step2: "2. Please ensure @musistudio/claude-code-router is installed",
        step3Warning: "3. ⚠️  Please manually set your DASHSCOPE_API_KEY environment variable:",
        step3Success: "3. ✅ API Key automatically configured from environment variable",
        promptApiKey: "Please enter your DashScope API Key:",
        apiKeyPrompt: "DashScope API Key",
        apiKeyConfigured: "✅ API Key configured successfully",
        invalidApiKey: "❌ API Key cannot be empty, please try again",
        step4: "4. Run ccr code to start using",
        configFailed: "❌ Configuration failed:",
        createDir: "📁 Creating directory:",
        createConfig: "📄 Creating configuration file:",
        createPlugin: "🔧 Creating plugin file:",
        editConfigInstructions: [
          `   cd `,
          `   open config.json  # macOS`,
          `   # Or open config.json with your preferred editor`,
          `   # Replace the "api_key" field with your DashScope API Key`
        ]
      }
    };
    return messages[this.language];
  }

  async promptForApiKey() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      const askForKey = () => {
        rl.question(`${this.messages.promptApiKey} `, (apiKey) => {
          const trimmedKey = apiKey.trim();
          if (trimmedKey) {
            console.log(this.messages.apiKeyConfigured);
            rl.close();
            resolve(trimmedKey);
          } else {
            console.log(this.messages.invalidApiKey);
            askForKey();
          }
        });
      };
      askForKey();
    });
  }

  async setup() {
    try {
      console.log(this.messages.configuring);

      // 检查环境变量
      let apiKey = process.env.DASHSCOPE_API_KEY;
      const hasEnvApiKey = !!apiKey;
      
      if (hasEnvApiKey) {
        console.log(this.messages.envKeyDetected);
      } else {
        console.log(this.messages.envKeyNotFound);
        // 提示用户输入 API Key
        apiKey = await this.promptForApiKey();
      }

      // 创建配置目录
      await this.createDirectories();

      // 创建配置文件
      await this.createConfigFile(apiKey);

      // 创建插件文件
      await this.createTransformerFile();

      console.log(this.messages.configComplete);
      console.log(this.messages.configLocation, this.configDir);
      console.log("");
      console.log(this.messages.usage);
      console.log(this.messages.step1);
      console.log(this.messages.step2);
      console.log(this.messages.step3Success);
      console.log(this.messages.step4);
    } catch (error) {
      console.error(this.messages.configFailed, error.message);
      process.exit(1);
    }
  }

  async createDirectories() {
    // 创建主配置目录
    await fs.ensureDir(this.configDir);

    // 创建插件目录
    await fs.ensureDir(this.pluginsDir);

    console.log(this.messages.createDir, this.configDir);
  }

  async createConfigFile(apiKey) {
    // 使用传入的 API Key（可能来自环境变量或用户输入）
    const dashscopeApiKey = apiKey;

    const configContent = {
      LOG: true,
      OPENAI_API_KEY: "",
      OPENAI_BASE_URL: "",
      OPENAI_MODEL: "",
      transformers: [
        {
          path: path.join(
            this.configDir,
            "plugins",
            "dashscope-transformer.js"
          ),
          options: {
            enable_thinking: false,
            stream: true,
          },
        },
      ],
      Providers: [
        {
          name: "dashscope",
          api_base_url:
            "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
          api_key: dashscopeApiKey,
          models: ["qwen3-coder-plus", "qwen3-coder-flash"],
          transformer: {
            use: ["dashscope"],
          },
        },
      ],
      Router: {
        default: "dashscope,qwen3-coder-plus",
        think: "dashscope,qwen3-coder-plus",
        background: "dashscope,qwen3-coder-flash",
        longContext: "dashscope,qwen3-coder-plus",
      },
    };

    await fs.writeJson(this.configFile, configContent, { spaces: 2 });
    console.log(this.messages.createConfig, this.configFile);
  }

  async createTransformerFile() {
    const transformerContent = `class DashScopeTransformer {
  name = "dashscope";

  constructor(options) {
    this.max_tokens = options.max_tokens || 8192;
    this.enable_thinking = options.enable_thinking || false;
    this.stream = options.stream || true;
  }

  async transformRequestIn(request, provider) {
    request.max_tokens = this.max_tokens;
    request.enable_thinking = this.enable_thinking;
    request.stream = this.stream;
    return request;
  }
}

module.exports = DashScopeTransformer;`;

    await fs.writeFile(this.transformerFile, transformerContent);
    console.log(this.messages.createPlugin, this.transformerFile);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const config = new ClaudeCodeRouterConfig();
  config.setup();
}

module.exports = ClaudeCodeRouterConfig;
