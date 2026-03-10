import { Button } from "@/components/ui/button";
import Image from "next/image";
import React from "react";

import ProjectsForm from "@/modules/home/components/projectForm";
import ProjectList from "@/modules/home/components/projectList";

const Page = () => {
  return (
    <div className="flex items-center justify-center w-full px-4 py-8">
      <div className="max-w-5xl w-full">
        <section className="space-y-8 flex flex-col items-center">
          <div className="flex flex-col items-center  ">
            <Image
              src={"/home.svg"}
              width={200}
              height={200}
              alt="Logo"
              className="hidden md:block dark:invert"
            />
          </div>
          <h1 className="text-2xl md:text-5xl font-bold text-center">
            Build Something with 💓
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground text-center">
            Create apps and websites by chatting with AI
          </p>

          <div className="max-w-3xl w-full">
            {" "}
            <ProjectsForm />
          </div>
          <ProjectList />
        </section>
      </div>
    </div>
  );
};

export default Page;
