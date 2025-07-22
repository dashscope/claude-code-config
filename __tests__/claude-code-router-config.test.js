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

  describe("createConfigFile", () => {
    beforeEach(() => {
      config = new ClaudeCodeRouterConfig();
    });

    it("should create config file with API Key from environment variable", async () => {
      process.env.DASHSCOPE_API_KEY = "test-api-key";

      await config.createConfigFile();

      expect(fs.writeJson).toHaveBeenCalledWith(
        config.configFile,
        expect.objectContaining({
          Providers: expect.arrayContaining([
            expect.objectContaining({
              api_key: "test-api-key",
            }),
          ]),
        }),
        { spaces: 2 }
      );
    });

    it("should use undefined API Key when environment variable is not present", async () => {
      delete process.env.DASHSCOPE_API_KEY;

      await config.createConfigFile();

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
      await config.createConfigFile();

      const writeJsonCall = fs.writeJson.mock.calls[0];
      const configContent = writeJsonCall[1];

      expect(configContent).toHaveProperty("LOG", true);
      expect(configContent).toHaveProperty("transformers");
      expect(configContent).toHaveProperty("Providers");
      expect(configContent).toHaveProperty("Router");
      expect(configContent.transformers).toHaveLength(1);
      expect(configContent.Providers).toHaveLength(1);
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
    });

    afterEach(() => {
      console.log.mockRestore();
      console.error.mockRestore();
    });

    it("should successfully complete setup process", async () => {
      await config.setup();

      expect(config.createDirectories).toHaveBeenCalled();
      expect(config.createConfigFile).toHaveBeenCalled();
      expect(config.createTransformerFile).toHaveBeenCalled();
    });

    it("should detect API Key in environment variable", async () => {
      process.env.DASHSCOPE_API_KEY = "test-key";

      await config.setup();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "DASHSCOPE_API_KEY environment variable detected"
        )
      );
    });

    it("should show warning when environment variable is not present", async () => {
      delete process.env.DASHSCOPE_API_KEY;

      await config.setup();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "DASHSCOPE_API_KEY environment variable not found"
        )
      );
    });

    it("should handle errors during setup process", async () => {
      const error = new Error("Setup failed");
      config.createDirectories.mockRejectedValue(error);

      await config.setup();

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
