import { inngest } from "./client";
import {
  gemini,
  createAgent,
  createTool,
  createNetwork,
} from "@inngest/agent-kit";
import Sandbox from "@e2b/code-interpreter";
import { Command } from "lucide-react";
import z from "zod";
import { PROMPT } from "@/prompt";
import { lastAssistantTextMessageContent } from "./utils";

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    //step-1
    //step to create a sandbox and get sandboxId
    const sandBoxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("prompt-base-v0");
      // use sandboxId not sandBoxId
      return sandbox.sandboxId;
    });

    const codeAgent = createAgent({
      name: "code-agent",
      description: "An expert code agent.",
      system: PROMPT,
      model: gemini({ model: "gemini-2.5-flash" }),
      tools: [
        //1. terminal tool
        createTool({
          name: "terminal",
          description:
            "A terminal to run bash commands in a linux environment.",

          parameters: z.object({
            command: z.string(),
          }),

          handler: async ({ command }, { step }) => {
            return step?.run("terminal-tool", async () => {
              const buffers = { stdout: "", stderr: "" };

              try {
                // connecting to the sandbox which was created in step-1
                const sandbox = await Sandbox.connect(sandBoxId);

                // running the command in the sandbox
                const result = await sandbox.commands.run(command, {
                  onStdout: (data) => {
                    buffers.stdout += data;
                  },

                  onStderr: (err) => {
                    buffers.stderr += err;
                  },
                });

                return result.stdout;
              } catch (error) {
                console.log(
                  `command execution failed: ${error}, \n Stderr: ${buffers.stderr}\n Stdout: ${buffers.stdout}`
                );
                return `command execution failed: ${error}, \n Stderr: ${buffers.stderr}\n Stdout: ${buffers.stdout}`;
              }
            });
          },
        }),

        //2. create or update files
        createTool({
          name: "file-system",
          description: "A tool to create ,update files in the sandbox.",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              })
            ),
          }),

          handler: async ({ files }, { step, network }) => {
            const newFiles = await step?.run(
              "createOrUpdateFiles",

              async () => {
                try {
                  const updatedFiles = network?.state?.data.files || {};
                  const sandbox = await Sandbox.connect(sandBoxId);

                  for (const file of files) {
                    await sandbox.files.write(file.path, file.content);
                    updatedFiles[file.path] = file.content;
                  }

                  return updatedFiles;
                } catch (error) {
                  console.log(`file creation failed: ${error}`);
                  return "Error: " + error;
                }
              }
            );

            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }
          },
        }),

        // 3. readFiles
        createTool({
          name: "readFiles",
          description: "A tool to read files from the sandbox.",
          parameters: z.object({
            files: z.array(z.string()),
          }),

          handler: async ({ files }, { step }) => {
            return step?.run("readFiles", async () => {
              try {
                const sandbox = await Sandbox.connect(sandBoxId);
                const contents = [];
                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push(content);
                }
                return JSON.stringify(contents);
              } catch (error) {
                console.log(`file read failed: ${error}`);
                return "Error: " + error;
              }
            });
          },
        }),
      ],

      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);

          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }

          return result;
        },

      },
    });

    const network = createNetwork({
      name: "coding-agent-network",
      agents: [codeAgent],
      maxIter: 8,

      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (summary) {
          return;
        }

        return codeAgent;
      },
    });

    const result = await network.run(event.data.value);

    const isError =
      !result.state.data.summary ||
      Object.keys(result.state.data.files || {}).length === 0;

    const sandBoxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await Sandbox.connect(sandBoxId);
      const host = sandbox.getHost(3000);
      return `http://${host}`;
    });

    return {
      url: sandBoxUrl,
      title: "untitled",
      files: result.state.data.files || {},
      summary: result.state.data.summary,
    };
  }
);
