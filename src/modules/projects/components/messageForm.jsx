"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import TextAreaAutosize from "react-textarea-autosize";
import { ArrowUpIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";

import { useCreateMessages } from "@/modules/messages/hooks/messages";

const formSchema = z.object({
  content: z
    .string()
    .min(1, "Message description is required")
    .max(1000, "Description is too long"),
});

const MessageForm = ({ projectId }) => {
  const [isFocused, setIsFocused] = useState(false);

  const { mutateAsync, isPending } = useCreateMessages(projectId);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
    },
    mode: "onChange",
  });

  const content = form.watch("content");
  const isActive = content?.trim().length > 0;

  const onSubmit = async (values) => {
    try {
      await mutateAsync(values.content);
      form.reset();
      toast.success("Message sent successfully");
    } catch (error) {
      toast.error(error.message || "Failed to send message");
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "relative border p-4 pt-1 rounded-xl bg-sidebar dark:bg-sidebar transition-all",
          isFocused && "shadow-lg ring-2 ring-primary/20"
        )}
      >
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <TextAreaAutosize
              {...field}
              disabled={isPending}
              placeholder="Describe what you want to create..."
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              minRows={3}
              maxRows={8}
              className={cn(
                "pt-4 resize-none border-none w-full outline-none bg-transparent",
                isPending && "opacity-50"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  form.handleSubmit(onSubmit)(e);
                }
              }}
            />
          )}
        />

        <div className="flex items-end justify-between gap-x-2 pt-2">
          <div className="text-[10px] text-muted-foreground font-mono">
            <kbd className="pointer-events-none inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium">
              <span>&#8984;</span>Enter
            </kbd>
            &nbsp;to submit
          </div>

          <Button
            type="submit"
            disabled={!isActive || isPending}
            className={cn(
              "size-8 rounded-full transition-colors",
              isPending && "bg-muted-foreground border",
              !isPending && isActive && "bg-primary text-primary-foreground",
              !isActive && "bg-muted text-muted-foreground"
            )}
          >
            {isPending ? (
              <Spinner />
            ) : (
              <ArrowUpIcon className="size-4" />
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default MessageForm;