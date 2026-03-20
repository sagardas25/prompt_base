"use server";

import { MessageRole, MessageType } from "@/prisma-db/client";
import db from "@/lib/db";
import { inngest } from "@/inngest/client";
import { getCurrentUser } from "@/modules/auth/actions";
import { consumeCredits } from "@/lib/usage";
import { log } from "@/lib/comment.js";

export const createMessage = async (value, projectId) => {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthorized");

  const project = await db.project.findFirst({
    where: {
      id: projectId,
      userId: user.id,
    },
  });

  if (!project) throw new Error("no project found");
  log("project : ", project);

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

  const newMessage = await db.message.create({
    data: {
      projectId: project.id,
      content: value,
      role: MessageRole.USER,
      type: MessageType.RESULT,
    },
  });

  await inngest.send({
    name: "code-agent/run",
    data: {
      value: value,
      projectId: project.id,
    },
  });

  return newMessage;
};

export const getMessages = async (projectId) => {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthorized");

  const project = await db.project.findUnique({
    where: {
      id: projectId,
      userId: user.id,
    },
  });

  if (!project) throw new Error("no project found");

  const messages = await db.message.findMany({
    where: {
      projectId,
    },
    orderBy: {
      updatedAt: "asc",
    },

    include: {
      fragments: true,
    },
  });

  return messages;
};
