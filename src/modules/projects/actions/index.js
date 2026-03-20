"use server";

import db from "@/lib/db.js";
import { inngest } from "@/inngest/client";
import { MessageRole, MessageType } from "@/prisma-db/client";
import { generateSlug } from "random-word-slugs";
import { getCurrentUser } from "@/modules/auth/actions";
import { consumeCredits } from "@/lib/usage";
import { log } from "@/lib/comment.js";

// user create a project by giving prompt
// eg : create a todo app
export const createProject = async (value) => {
  log("db : ", Object.keys(db));
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthrized");

  // create a project and store in db
  const newProject = await db.project.create({
    data: {
      name: generateSlug(2, { format: "title" }),
      userId: user.id,
      messages: {
        create: {
          content: value,
          role: MessageRole.USER, // messageRole == User --> human prompt
          type: MessageType.RESULT,
        },
      },
    },
  });

  try {
    await consumeCredits();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error({
        code: "BAD_REQUEST",
        message: "Something went wrong",
      });
    } else {
      throw new Error({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests",
      });
    }
  }

  // invoke ai agent
  // ai agent will get the projectId and will modify that project
  await inngest.send({
    name: "code-agent/run",
    data: {
      value,
      projectId: newProject.id,
    },
  });

  return newProject;
};

// get the projects created by the user
export const getProjects = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthrized");

  const projects = await db.project.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return projects;
};

// get the project by id
export const getProjectById = async (projectId) => {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthrized");

  const project = await db.project.findUnique({
    where: {
      id: projectId,
      userId: user.id,
    },
  });

  if (!project) {
    throw new Error("project not found");
  }

  return project;
};
