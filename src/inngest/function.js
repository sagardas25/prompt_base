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
import { MessageRole, MessageType } from "@/db/client";

export const codeAgentFunction = inngest.createFunction(
  { id: "prompt-base" },
  { event: "code-agent/run" },

  // step -- used for durable step execution
  // event -- contains user input
  async ({ event, step }) => {
    console.log("messagerole : ", MessageRole);
    // get sandbox id
    const sandBoxId = await step.run("get-sandbox-id", async () => {
      //create a sandbox from template "test-base-v-1"
      const result = await Sandbox.create("test-base-v-1");
      return result.sandboxId;
    });

    // ai agent Configuration
    const supportAgent = createAgent({
      name: "code-agent",
      description: "An expert coding agent",
      system: PROMPT,
      model: gemini({
        model: "gemini-2.5-flash",
      }),

      tools: [
        // 1. Terminal tool
        createTool({
          name: "terminal_tool",
          description: "Use the terminals to run commands",
          //input schema valiadation
          parameters: z.object({
            command: z.string(),
          }),

          // controls how to execute the tool
          // network --> Shared execution state across iterations
          // step --> from inngest workflow
          handler: async ({ command }, { network, agent, step }) => {
            //Tool execution becomes a durable sub-step
            return await step?.run("terminal", async () => {
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
          name: "create_or_update_files",
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
                //Load previously written files from memory
                const updatedFiles = network?.state?.data.files || {};

                const sandbox = await Sandbox.connect(sandBoxId);

                for (const file of files) {
                  // Write to real sandbox filesystem
                  await sandbox.files.write(file.path, file.content);
                  // Update in-memory updatedFiles
                  updatedFiles[file.path] = file.content;
                }

                return updatedFiles;
              } catch (error) {
                console.log("error : ", error);
              }
            });

            if (typeof newFile === "object") {
              network.state.data.files = newFile;
              // console.log("AFTER ASSIGNMENT NETWORK:", network);
            }
          },
        }),
        // 3. readFiles
        // useful to know existing filesystem inside sandbox for furthur changes
        createTool({
          name: "read_files",
          description: "Read file contents from the sandbox",
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({ files }, { step }) => {
            return await step?.run("readFiles", async () => {
              try {
                const sandbox = await Sandbox.connect(sandBoxId);
                const contents = [];
                for (const file of files) {
                  //Remote filesystem read happens
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

      // controls when to stop
      // Runs after every assistant response
      // detects <task_summary> </task_summary> and stores it
      // it works like a control signal generator of stopping condition
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

    // Controls which agent runs, how many times it runs, and when execution stops
    const network = createNetwork({
      name: "coding-agent-network",
      agents: [supportAgent],
      maxIter: 10,
      router: async ({ network }) => {
        // if summary is there then stop
        const summary = network.state.data.summary;
        if (summary) return;

        // else run agent again
        return supportAgent;
      },
    });

    const finalOutput = await network.run(event.data.value);

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
      files: finalOutput.state.data.files,
      summary: finalOutput.state.data.summary,
    };
  },
);
