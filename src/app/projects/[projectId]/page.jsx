import ProjectView from "@/modules/projects/components/projectView";
import React from "react";

const Page = async ({ params }) => {
  const { projectId } = await params;

  return (
    <ProjectView projectId={projectId} />
  );
};

export default Page;