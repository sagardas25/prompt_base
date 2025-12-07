"use server";
import db from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { Select } from "react-day-picker";
import { success } from "zod";

export const onBoardUser = async () => {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        message: "No user logged in",
      };
    }

    const { firstName, lastName, imageUrl, emailAddresses } = user;

    const newUser = await db.user.upsert({
      where: {
        clerkId: user.id,
      },
      update: {
        email: emailAddresses[0]?.emailAddress || "",
        name:
          firstName && lastName
            ? `${firstName} ${lastName}`
            : firstName || lastName || null,
        image: imageUrl || null,
      },
      create: {
        clerkId: user.id,
        email: emailAddresses[0]?.emailAddress || "",
        name:
          firstName && lastName
            ? `${firstName} ${lastName}`
            : firstName || lastName || null,
        image: imageUrl || null,
      },
    });

    return {
      user: newUser,
      success: true,
      message: "User onboarded successfully",
    };
  } catch (error) {
    console.error("Error onboarding user:", error);
    return {
      success: false,
      message: "Failed to onboard user",
  }
}; }

export const getCurrentUser = async (params) => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error("User not found");
    }

    const dbUser = await db.user.findUnique({
      where: {
        clerkId: user.id,
      },
      Select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        image: true,
      },
    });

    if (!dbUser) {
      return {
        success: false,
        message: "User not found in database",
      }
    }

    return dbUser;
  } catch (error) {
    console.error("Error retrieving user:", error);
    return {
      success: false,
      message: "Failed to retrieve user",
    }
  }
};
