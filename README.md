# @dashscope-js/claude-code-config

A Node.js package that provides default configuration for claude-code-router with DashScope support.

[中文文档](./README.zh-CN.md) | English

## Prerequisites

- Node.js >= 14.0.0
- DashScope API Key (get one from [Alibaba Cloud Model Studio](https://bailian.console.alibabacloud.com/?tab=dashboard#/api-key))

## Quick Start

### 1. Set up API Key (Required)

**Option 1: Environment Variable (Recommended)**

```bash
export DASHSCOPE_API_KEY="your-api-key-here"
```

**Option 2: You can also configure manually after setup (see Configuration section)**

### 2. Installation

First, install the required dependencies:

```bash
# 1. Install claude-code
npm install -g @anthropic-ai/claude-code

# 2. Install claude-code-router
npm install -g @musistudio/claude-code-router
```

Then choose one of the following installation methods for the configuration package:

**Option 1: Install from npm registry (Recommended)**

```bash
npm install -g @dashscope-js/claude-code-config
```

**Option 2: Install from source code**

```bash
# Clone the repository
git clone https://github.com/dashscope/claude-code-config.git
cd claude-code-config

# Install dependencies and install globally
npm install
npm install -g .
```

### 3. Run Configuration

```bash
ccr-dashscope
```

### 4. Start Using

```bash
ccr code
```

## Language Support

This tool supports bilingual Chinese/English and automatically selects based on system language:

- Chinese environment (`LANG` contains `zh`): Displays Chinese prompts
- Other environments: Displays English prompts

## Configuration

Default configuration directory: `~/.claude-code-router/`

- Main configuration file: `~/.claude-code-router/config.json`
- Plugins directory: `~/.claude-code-router/plugins/`

Running `ccr-dashscope` will automatically generate the above directories and files.

### Manual API Key Configuration

If you didn't set the environment variable before running `ccr-dashscope`, you can manually edit the configuration file:

1. Navigate to the configuration directory:

   ```bash
   cd ~/.claude-code-router
   ```

2. Edit the configuration file:

   ```bash
   # On macOS/Linux
   nano config.json
   # or use your preferred editor
   ```

3. Replace the `"api_key"` field with your actual DashScope API Key

### Supported Models

- `qwen3-235b-a22b` - Default model with long context and streaming support

## Troubleshooting

### Common Issues

1. **API Key not working**: Ensure your DashScope API Key is valid and has sufficient quota
2. **Command not found**: Make sure all packages are installed globally with `-g` flag
3. **Permission issues**: You may need to run with `sudo` on some systems for global installation

### Getting Help

- Check the [Alibaba ModelStudio Documentation](https://bailian.console.alibabacloud.com/?tab=doc#/doc)

## Features

- 🌐 Automatic multilingual support (Chinese/English)
- 🔧 One-click DashScope integration setup
- 🚀 Streaming response support
- 📝 Intelligent request transformation
- 🔑 Flexible API Key configuration methods

## License

Apache-2.0
