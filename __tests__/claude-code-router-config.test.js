const fs = require("fs-extra");
const os = require("os");

// Mock fs-extra
jest.mock("fs-extra");

// Mock process.env
const originalEnv = process.env;

// Mock process.exit
const originalExit = process.exit;

describe("ClaudeCodeRouterConfig", () => {
  let ClaudeCodeRouterConfig;
  let config;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock os.homedir()
    jest.spyOn(os, "homedir").mockReturnValue("/mock/home");

    // Reset process.env
    process.env = { ...originalEnv };

    // Mock process.exit
    process.exit = jest.fn();

    // Import the class
    ClaudeCodeRouterConfig = require("../bin/claude-code-router-config");
  });

  afterEach(() => {
    // Restore process.env
    process.env = originalEnv;
    // Restore process.exit
    process.exit = originalExit;
  });

  describe("constructor", () => {
    it("should correctly initialize configuration paths", () => {
      config = new ClaudeCodeRouterConfig();

      expect(config.homeDir).toBe("/mock/home");
      expect(config.configDir).toBe("/mock/home/.claude-code-router");
      expect(config.configFile).toBe(
        "/mock/home/.claude-code-router/config.json"
      );
      expect(config.pluginsDir).toBe("/mock/home/.claude-code-router/plugins");
      expect(config.transformerFile).toBe(
        "/mock/home/.claude-code-router/plugins/dashscope-transformer.js"
      );
    });

    it("should detect Chinese language environment", () => {
      process.env.LANG = "zh_CN.UTF-8";
      config = new ClaudeCodeRouterConfig();
      expect(config.language).toBe("zh");
    });

    it("should detect English language environment", () => {
      process.env.LANG = "en_US.UTF-8";
      config = new ClaudeCodeRouterConfig();
      expect(config.language).toBe("en");
    });

    it("should default to English", () => {
      delete process.env.LANG;
      delete process.env.LANGUAGE;
      delete process.env.LC_ALL;
      config = new ClaudeCodeRouterConfig();
      expect(config.language).toBe("en");
    });
  });

  describe("getMessages", () => {
    beforeEach(() => {
      config = new ClaudeCodeRouterConfig();
    });

    it("should return Chinese messages", () => {
      config.language = "zh";
      const messages = config.getMessages();

      expect(messages.configuring).toBe("🚀 正在配置 claude-code-router...");
      expect(messages.configComplete).toBe("✅ claude-code-router 配置完成！");
    });

    it("should return English messages", () => {
      config.language = "en";
      const messages = config.getMessages();

      expect(messages.configuring).toBe("🚀 Configuring claude-code-router...");
      expect(messages.configComplete).toBe(
        "✅ claude-code-router configuration completed!"
      );
    });
  });

  describe("createDirectories", () => {
    beforeEach(() => {
      config = new ClaudeCodeRouterConfig();
    });

    it("should create configuration and plugins directories", async () => {
      await config.createDirectories();

      expect(fs.ensureDir).toHaveBeenCalledWith(config.configDir);
      expect(fs.ensureDir).toHaveBeenCalledWith(config.pluginsDir);
    });

    it("should handle directory creation errors", async () => {
      const error = new Error("Permission denied");
      fs.ensureDir.mockRejectedValue(error);

      await expect(config.createDirectories()).rejects.toThrow(
        "Permission denied"
      );
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      config = new ClaudeCodeRouterConfig();
    });

    it("should handle transformer file write errors", async () => {
      const error = new Error("Write failed");
      fs.writeFile.mockRejectedValueOnce(error);
      fs.writeJson.mockResolvedValue(); // Make sure other fs operations succeed

      await expect(config.createTransformerFile()).rejects.toThrow(
        "Write failed"
      );
    });

    it("should handle config file write errors", async () => {
      const error = new Error("JSON write failed");
      fs.writeJson.mockRejectedValueOnce(error);
      fs.writeFile.mockResolvedValue(); // Make sure other fs operations succeed

      await expect(config.createConfigFile("test-key", "cn")).rejects.toThrow(
        "JSON write failed"
      );
    });
  });

  describe("createConfigFile", () => {
    beforeEach(() => {
      config = new ClaudeCodeRouterConfig();
    });

    it("should create config file with API Key from environment variable", async () => {
      const testApiKey = "test-api-key-from-env";
      const testRegion = "cn";
      
      await config.createConfigFile(testApiKey, testRegion);

      expect(fs.writeJson).toHaveBeenCalledWith(
        config.configFile,
        expect.objectContaining({
          Providers: expect.arrayContaining([
            expect.objectContaining({
              api_key: testApiKey,
              api_base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
            }),
          ]),
        }),
        { spaces: 2 }
      );
    });

    it("should create config file with provided API Key", async () => {
      const testApiKey = "test-api-key-provided";
      const testRegion = "intl";
      
      await config.createConfigFile(testApiKey, testRegion);

      expect(fs.writeJson).toHaveBeenCalledWith(
        config.configFile,
        expect.objectContaining({
          Providers: expect.arrayContaining([
            expect.objectContaining({
              api_key: testApiKey,
              api_base_url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
            }),
          ]),
        }),
        { spaces: 2 }
      );
    });

    it("should use undefined API Key when no API Key is provided", async () => {
      await config.createConfigFile(undefined, "cn");

      expect(fs.writeJson).toHaveBeenCalledWith(
        config.configFile,
        expect.objectContaining({
          Providers: expect.arrayContaining([
            expect.objectContaining({
              api_key: undefined,
            }),
          ]),
        }),
        { spaces: 2 }
      );
    });

    it("should contain correct configuration structure", async () => {
      await config.createConfigFile("test-key", "cn");

      const writeJsonCall = fs.writeJson.mock.calls[0];
      const configContent = writeJsonCall[1];

      expect(configContent).toHaveProperty("LOG", true);
      expect(configContent).toHaveProperty("transformers");
      expect(configContent).toHaveProperty("Providers");
      expect(configContent).toHaveProperty("Router");
      expect(configContent.transformers).toHaveLength(1);
      expect(configContent.Providers).toHaveLength(1);
      
      // Check models configuration
      expect(configContent.Providers[0].models).toEqual(["qwen3-coder-plus"]);
      
      // Check router configuration
      expect(configContent.Router.default).toBe("dashscope,qwen3-coder-plus");
      expect(configContent.Router.think).toBe("dashscope,qwen3-coder-plus");
      expect(configContent.Router.background).toBe("dashscope,qwen3-coder-plus");
      expect(configContent.Router.longContext).toBe("dashscope,qwen3-coder-plus");
    });
  });

  describe("createTransformerFile", () => {
    beforeEach(() => {
      config = new ClaudeCodeRouterConfig();
    });

    it("should create transformer file", async () => {
      await config.createTransformerFile();

      expect(fs.writeFile).toHaveBeenCalledWith(
        config.transformerFile,
        expect.stringContaining("class DashScopeTransformer")
      );
    });

    it("should contain correct transformer code", async () => {
      await config.createTransformerFile();

      const writeFileCall = fs.writeFile.mock.calls[0];
      const content = writeFileCall[1];

      expect(content).toContain("class DashScopeTransformer");
      expect(content).toContain('name = "dashscope"');
      expect(content).toContain("transformRequestIn");
      expect(content).toContain("module.exports = DashScopeTransformer");
    });
  });

  describe("setup", () => {
    beforeEach(() => {
      config = new ClaudeCodeRouterConfig();

      // Mock console.log
      jest.spyOn(console, "log").mockImplementation();
      jest.spyOn(console, "error").mockImplementation();

      // Mock the methods to avoid actual execution
      jest.spyOn(config, "createDirectories").mockResolvedValue();
      jest.spyOn(config, "createConfigFile").mockResolvedValue();
      jest.spyOn(config, "createTransformerFile").mockResolvedValue();
      jest.spyOn(config, "promptForApiKey").mockResolvedValue("user-input-key");
      jest.spyOn(config, "promptForRegion").mockResolvedValue("cn");
    });

    afterEach(() => {
      console.log.mockRestore();
      console.error.mockRestore();
    });

    it("should successfully complete setup process with environment variable", async () => {
      process.env.DASHSCOPE_API_KEY = "env-test-key";

      await config.setup();

      expect(config.promptForRegion).toHaveBeenCalled();
      expect(config.createDirectories).toHaveBeenCalled();
      expect(config.createConfigFile).toHaveBeenCalledWith("env-test-key", "cn");
      expect(config.createTransformerFile).toHaveBeenCalled();
      expect(config.promptForApiKey).not.toHaveBeenCalled();
    });

    it("should detect API Key in environment variable", async () => {
      process.env.DASHSCOPE_API_KEY = "test-key-from-env";

      await config.setup();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "DASHSCOPE_API_KEY environment variable detected"
        )
      );
      expect(config.createConfigFile).toHaveBeenCalledWith("test-key-from-env", "cn");
    });

    it("should prompt for API Key when environment variable is not present", async () => {
      delete process.env.DASHSCOPE_API_KEY;

      await config.setup();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "DASHSCOPE_API_KEY environment variable not found"
        )
      );
      expect(config.promptForApiKey).toHaveBeenCalled();
      expect(config.createConfigFile).toHaveBeenCalledWith("user-input-key", "cn");
    });

    it("should handle errors during setup process", async () => {
      const error = new Error("Setup failed");
      config.createDirectories.mockRejectedValue(error);

      await config.setup();

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("promptForRegion", () => {
    beforeEach(() => {
      config = new ClaudeCodeRouterConfig();
      
      // Mock console.log
      jest.spyOn(console, "log").mockImplementation();
    });

    afterEach(() => {
      console.log.mockRestore();
    });

    it("should prompt for region and return 'cn' when user selects 1", async () => {
      const mockReadline = {
        question: jest.fn(),
        close: jest.fn()
      };

      const readline = require("readline");
      jest.spyOn(readline, "createInterface").mockReturnValue(mockReadline);

      mockReadline.question.mockImplementation((prompt, callback) => {
        callback("1");
      });

      const result = await config.promptForRegion();

      expect(readline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout
      });
      expect(mockReadline.question).toHaveBeenCalled();
      expect(mockReadline.close).toHaveBeenCalled();
      expect(result).toBe("cn");
    });

    it("should prompt for region and return 'intl' when user selects 2", async () => {
      const mockReadline = {
        question: jest.fn(),
        close: jest.fn()
      };

      const readline = require("readline");
      jest.spyOn(readline, "createInterface").mockReturnValue(mockReadline);

      mockReadline.question.mockImplementation((prompt, callback) => {
        callback("2");
      });

      const result = await config.promptForRegion();

      expect(result).toBe("intl");
      expect(mockReadline.close).toHaveBeenCalled();
    });

    it("should re-prompt when invalid input is provided", async () => {
      const mockReadline = {
        question: jest.fn(),
        close: jest.fn()
      };

      const readline = require("readline");
      jest.spyOn(readline, "createInterface").mockReturnValue(mockReadline);

      let callCount = 0;
      mockReadline.question.mockImplementation((prompt, callback) => {
        callCount++;
        if (callCount === 1) {
          callback("invalid");
        } else {
          callback("1");
        }
      });

      const result = await config.promptForRegion();

      expect(mockReadline.question).toHaveBeenCalledTimes(2);
      expect(result).toBe("cn");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Please enter 1 or 2")
      );
    });
  });

  describe("getApiBaseUrl", () => {
    beforeEach(() => {
      config = new ClaudeCodeRouterConfig();
    });

    it("should return China URL for 'cn' region", () => {
      const result = config.getApiBaseUrl("cn");
      expect(result).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
    });

    it("should return International URL for 'intl' region", () => {
      const result = config.getApiBaseUrl("intl");
      expect(result).toBe("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions");
    });

    it("should default to China URL for unknown region", () => {
      const result = config.getApiBaseUrl("unknown");
      expect(result).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
    });
  });

  describe("promptForApiKey", () => {
    beforeEach(() => {
      config = new ClaudeCodeRouterConfig();
      
      // Mock console.log
      jest.spyOn(console, "log").mockImplementation();
    });

    afterEach(() => {
      console.log.mockRestore();
    });

    it("should prompt for API Key and return user input", async () => {
      const mockReadline = {
        question: jest.fn(),
        close: jest.fn()
      };

      // Mock readline.createInterface
      const readline = require("readline");
      jest.spyOn(readline, "createInterface").mockReturnValue(mockReadline);

      // Mock the question callback to simulate user input
      mockReadline.question.mockImplementation((prompt, callback) => {
        callback("user-provided-api-key");
      });

      const result = await config.promptForApiKey();

      expect(readline.createInterface).toHaveBeenCalledWith({
        input: process.stdin,
        output: process.stdout
      });
      expect(mockReadline.question).toHaveBeenCalledWith(
        expect.stringContaining("API Key"),
        expect.any(Function)
      );
      expect(mockReadline.close).toHaveBeenCalled();
      expect(result).toBe("user-provided-api-key");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("configured")
      );
    });

    it("should re-prompt when empty API Key is provided", async () => {
      const mockReadline = {
        question: jest.fn(),
        close: jest.fn()
      };

      const readline = require("readline");
      jest.spyOn(readline, "createInterface").mockReturnValue(mockReadline);

      // First call returns empty string, second call returns valid key
      let callCount = 0;
      mockReadline.question.mockImplementation((prompt, callback) => {
        callCount++;
        if (callCount === 1) {
          callback("  "); // Empty/whitespace only
        } else {
          callback("valid-api-key");
        }
      });

      const result = await config.promptForApiKey();

      expect(mockReadline.question).toHaveBeenCalledTimes(2);
      expect(result).toBe("valid-api-key");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("cannot be empty")
      );
    });
  });
});
