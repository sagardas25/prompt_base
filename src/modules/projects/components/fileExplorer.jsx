import { CopyCheckIcon, CopyIcon } from "lucide-react";
import { useState, useMemo, useCallback, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { CodeView } from "./codeView/index";
import {
  ResizablePanel,
  ResizableHandle,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";

import { convertFilesToTreeItems } from "@/lib/utils";
import { TreeView } from "./treeView";
import { Hint } from "@/components/ui/hint";

const FileBreadcrumb = ({ filePath }) => {
  const pathSegments = filePath.split("/");
  const maxSegments = 4;

  const renderBreadCrumItems = () => {
    if (pathSegments.length <= maxSegments) {
      return pathSegments.map((segment, index) => {
        const isLast = index === pathSegments.length - 1;

        return (
          <Fragment key={index}>
            <BreadcrumbItem>
              {isLast ? (
                <BreadcrumbPage>{segment}</BreadcrumbPage>
              ) : (
                <span className="text-muted-foreground">{segment}</span>
              )}
            </BreadcrumbItem>

            {!isLast && <BreadcrumbSeparator />}
          </Fragment>
        );
      });
    }

    const firstSegment = pathSegments[0];
    const lastSegment = pathSegments[pathSegments.length - 1];

    return (
      <>
        <BreadcrumbItem>
          <span className="text-muted-foreground">{firstSegment}</span>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <BreadcrumbPage>{lastSegment}</BreadcrumbPage>
        </BreadcrumbItem>
      </>
    );
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>{renderBreadCrumItems()}</BreadcrumbList>
    </Breadcrumb>
  );
};

function getLanguageFromExtension(filename) {
  const extension = filename.split(".").pop()?.toLowerCase();

  const languageMap = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
  };

  return languageMap[extension] || "text";
}

export const FileExplorer = ({ files }) => {
  const fileMap = useMemo(() => {
    return files?.files ?? files ?? {};
  }, [files]);

  const [copied, setCopied] = useState(false);

  const [selectedFile, setSelectedFile] = useState(() => {
    const fileKeys = Object.keys(fileMap);
    return fileKeys.length > 0 ? fileKeys[0] : null;
  });

  const treeData = useMemo(() => {
    return convertFilesToTreeItems(fileMap);
  }, [fileMap]);

  const handleFileSelect = useCallback(
    (filePath) => {
      if (fileMap[filePath]) {
        setSelectedFile(filePath);
      }
    },
    [fileMap],
  );

  const handleCopy = useCallback(() => {
    if (selectedFile && fileMap[selectedFile]) {
      navigator.clipboard
        .writeText(fileMap[selectedFile])
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((error) => {
          console.error("Failed to copy:", error);
        });
    }
  }, [selectedFile, fileMap]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* FILE TREE */}
      <ResizablePanel
        defaultSize={25}
        minSize={100}
        maxSize={500}
        className="bg-sidebar border-r"
      >
        <div className="h-full overflow-auto">
          <TreeView
            data={treeData}
            value={selectedFile}
            onSelect={handleFileSelect}
          />
        </div>
      </ResizablePanel>

      {/* RESIZE HANDLE */}
      <ResizableHandle
        withHandle
        className="bg-border hover:bg-muted transition-colors"
      />

      {/* FILE VIEWER */}
      <ResizablePanel defaultSize={75} minSize={40}>
        {selectedFile && fileMap[selectedFile] ? (
          <div className="h-full flex flex-col">
            {/* FILE HEADER */}
            <div className="sticky top-0 z-10 border-b bg-background flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedFile.split("/").pop()}
                </span>

                <span className="text-xs text-muted-foreground">
                  {getLanguageFromExtension(selectedFile)}
                </span>
              </div>
              <Hint label={copied ? "Copied!" : "Copy code"} side="bottom">
                <Button variant="ghost" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <CopyCheckIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </Button>
              </Hint>
            </div>

            {/* CODE CONTAINER */}
            <div className="flex-1 overflow-auto p-4 bg-muted/20">
              <div className="rounded-md border bg-background">
                <CodeView
                  code={fileMap[selectedFile]}
                  lang={getLanguageFromExtension(selectedFile)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">No file selected</p>
              <p className="text-xs">
                Select a file from the explorer to preview its contents
              </p>
            </div>
          </div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
