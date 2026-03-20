import { currentUser } from "@clerk/nextjs/server";
import db from "@/lib/db.js";
import { log } from "@/lib/comment.js";

// save the user data
export const onBoardUser = async () => {
  try {
    const user = await currentUser();

    // log("user : ", user);
    // log("email -add : ", user.emailAddresses?.[0]?.emailAddress);

    if (!user) {
      return {
        success: false,
        error: " no authenticated user found",
      };
    }

    const { id, firstName, lastName, emailAddresses, imageUrl } = user;

    //either update an existing user or create a new one
    const newUser = await db.user.upsert({
      where: {
        clerkid: id,
      },
      update: {
        name:
          firstName && lastName
            ? `${firstName} ${lastName}`
            : firstName || lastName || null,

        email: emailAddresses?.[0]?.emailAddress || null,
        image: imageUrl || null,
      },
      create: {
        clerkid: id,
        name:
          firstName && lastName
            ? `${firstName} ${lastName}`
            : firstName || lastName || null,
        email: emailAddresses?.[0]?.emailAddress || null,
        image: imageUrl || null,
      },
    });

    return {
      success: true,
      user: newUser,
      message: "user onboarded successfully",
    };
  } catch (error) {
    log("Error onboarding user : ", error);
    return {
      success: false,
      message: "user onboarding failed",
    };
  }
};

// get the current user
export const getCurrentUser = async () => {
  try {
    const user = await currentUser();
    if (!user) {
      return null;
    }

    // find the user based on if from db
    const dbUser = await db.user.findUnique({
      where: {
        clerkid: user.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        clerkid: true,
      },
    });

    return dbUser;
  } catch (error) {
    log("error fetching user , error : ", error);
    return null;
  }
};
