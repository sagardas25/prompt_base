import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MessageRole, MessageType } from "@/constants/constant.js";
import { format } from "date-fns";
import { ChevronRightIcon, Code2Icon } from "lucide-react";
import Image from "next/image";
import React from "react";
import ReactMarkdown from "react-markdown";

/* Fragment Card */
const FragmentCard = ({ fragment, isActiveFragment, onFragmentClick }) => {
  // console.log("isActiveFragment:", isActiveFragment);
  return (
    <button
      onClick={() => onFragmentClick(fragment)}
      className={cn(
        "flex items-start text-start gap-2 border rounded-lg bg-muted w-fit p-2 transition-colors hover:bg-secondary",
        isActiveFragment &&
          "bg-primary text-primary-foreground border-primary hover:bg-primary",
      )}
    >
      <Code2Icon className="size-4 mt-0.5" />

      <div className="flex flex-col flex-1">
        <span className="text-sm font-medium line-clamp-1">
          {fragment.title}
        </span>
        <span className="text-sm">Preview</span>
      </div>

      <ChevronRightIcon className="size-4 mt-0.5" />
    </button>
  );
};

/*  User Message  */
const UserMessage = ({ content }) => {
  return (
    <div className="flex justify-end pb-4 pr-2 pl-10">
      <Card className="rounded-lg bg-muted p-2 shadow-none border-none max-w-[80%] wrap-break-words">
        {content}
      </Card>
    </div>
  );
};

/*  Assistant Message  */
const AssistantMessage = ({
  content,
  fragment,
  createdAt,
  isActiveFragment,
  onFragmentClick,
  type,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col group px-2 pb-4",
        type === MessageType.ERROR && "text-red-700 dark:text-red-500",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 pl-2 mb-2">
        <Image
          alt="logo-image"
          src="/logo.svg"
          height={20}
          width={20}
          className="hidden md:block dark:invert"
        />

        <span className="text-xs text-muted-foreground opacity-100 transition-opacity group-hover:opacity-100">
          {format(new Date(createdAt), "HH:mm 'on' MMM dd, yyyy")}
        </span>
      </div>

      {/* Content */}
      <div className="pl-8 flex flex-col gap-y-4">
        {content && (
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {fragment && type === MessageType.RESULT && (
          <FragmentCard
            fragment={fragment}
            isActiveFragment={isActiveFragment}
            onFragmentClick={onFragmentClick}
          />
        )}
      </div>
    </div>
  );
};

/*  Message Card  */

const MessageCard = ({
  content,
  role,
  fragment,
  createdAt,
  isActiveFragment,
  onFragmentClick,
  type,
}) => {
  if (role === MessageRole.ASSISTANT) {
    return (
      <AssistantMessage
        content={content}
        fragment={fragment}
        createdAt={createdAt}
        isActiveFragment={isActiveFragment}
        onFragmentClick={onFragmentClick}
        type={type}
      />
    );
  }

  return (
    <div className="mt-5">
      <UserMessage content={content} />
    </div>
  );
};

export default MessageCard;
