import { Sandbox } from "e2b";
import { inngest } from "./client.js";
import { codeAgent } from "./agents/agents.js";
import {
  createAgent,
  createNetwork,
  createTool,
  gemini,
} from "@inngest/agent-kit";
import { lastAssistantTextMessageContent } from "./utils/util.js";
import { PROMPT } from "./constants/prompt.js";
import z from "zod";

export const codeAgentFunction = inngest.createFunction(
  { id: "prompt-base" },
  { event: "code-agent/run" },

  async ({ event, step }) => {

    // get sandbox id
    const sandBoxId = await step.run("get-sandbox-id", async () => {
      const result = await Sandbox.create("test-base-v-1");

      return result.sandboxId;
    });

    const supportAgent = createAgent({
      name: "code-agent",
      description: "An expert coding agent",
      system: PROMPT,
      model: gemini({
        model: "gemini-2.5-flash",
      }),

      tools: [
        // 1. Terminals
        createTool({
          name: "terminal_tool",
          description: "Use the terminals to run commands",
          parameters: z.object({
            command: z.string(),
          }),

          handler: async ({ command }, { network, agent, step }) => {
            await step?.run("terminal", async () => {
              const buffers = { stdout: "", stderr: "" };

              try {
                const sandbox = await Sandbox.connect(sandBoxId);

                const result = await sandbox.commands.run(command, {
                  onStdout: (data) => {
                    buffers.stdout += data;
                  },
                  onStderr: (data) => {
                    buffers.stderr += data;
                  },
                });

                return result.stdout;
              } catch (error) {
                console.error(
                  `Command failed: ${error} \nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`,
                );
                return `Command failed: ${error} \nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`;
              }
            });
          },
        }),
        // 2. createOrUpdateFiles
        createTool({
          name: "createOrUpdateFiles",
          description: "create or update files in the sandbox",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              }),
            ),
          }),

          handler: async ({ files }, { step, network }) => {
            const newFile = await step?.run("createOrUpdateFile", async () => {
              try {
                const updatedFiles = (await network?.state?.data.files) || {};

                const sandbox = await Sandbox.connect(sandBoxId);

                for (const file of files) {
                  await sandbox.files.write(file.path, file.content);
                  updatedFiles[file.path] = file.content;
                }

                return updatedFiles;
              } catch (error) {
                console.log("error : ", error);
              }
            });

            if (typeof newFile === "object") {
              network.state.data.files = newFile;
            }
          },
        }),
        // 3. readFiles
        createTool({
          name: "readFiles",
          description: "",
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({ files }, { step }) => {
            await step?.run("readFiles", async () => {
              try {
                const sandbox = await Sandbox.connect(sandBoxId);
                const contents = [];
                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }

                return JSON.stringify(contents);
              } catch (error) {
                return `error : ${error}`;
              }
            });
          },
        }),
      ],

      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessage = lastAssistantTextMessageContent(result);
          if (lastAssistantMessage && network) {
            if (lastAssistantMessage.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessage;
            }
          }
          return result;
        },
      },
    });

    const network = createNetwork({
      name: "coding-agent-network",
      agents: [supportAgent],
      maxIter: 10,
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (summary) return;

        return supportAgent;
      },
    });

    const result = await network.run(event.data.value);

    // get sandbox url
    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await Sandbox.connect(sandBoxId);
      const host = sandbox.getHost(3000);
      const url = `https://${host}`;
      return url;
    });

    return {
      url: sandboxUrl,
      title: "untitled",
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
  },
);
