"use server";

import db from "@/lib/db.js";
import { inngest } from "@/inngest/client";
import { MessageRole, MessageType } from "@/db/client";
import { generateSlug } from "random-word-slugs";
import { getCurrentUser } from "@/modules/auth/actions";

// user create a project by giving prompt
// eg : create a todo app
export const createProject = async (value) => {
  const user = getCurrentUser();
  if (!user) throw new Error("unauthrized");

  // create a project and store in db
  const newProject = await db.project.create({
    
    name: generateSlug(2, { format: "title" }),
    userId: user.id,
    messages: {
      content: value,
      role: MessageRole.USER, // messageRole == User --> human prompt
      type: MessageType.RESULT,
    },
  });

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
  const user = getCurrentUser();
  if (!user) throw new Error("unauthrized");

  const projects = await db.findMany({
    where: {
      userid: user.id,
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return projects;
};

// get the project by id
export const getProjectById = async (projectId) => {
  const user = getCurrentUser();
  if (!user) throw new Error("unauthrized");

  const project = await db.findUnique({
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
