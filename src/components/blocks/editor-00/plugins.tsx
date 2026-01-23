import { useState } from "react"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { FORMAT_TEXT_COMMAND } from "lexical"
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { Bold, Code, Italic, List, ListOrdered, Underline } from "lucide-react"

import { Toggle } from "@/components/ui/toggle"
import { ContentEditable } from "@/components/editor/editor-ui/content-editable"

import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin"
import { TRANSFORMERS } from "@lexical/markdown"

import { CounterCharacterPlugin } from "@/components/editor/plugins/actions/counter-character-plugin"

function Toolbar() {
  const [editor] = useLexicalComposerContext()

  return (
    <div className="flex items-center gap-1 border-b p-1">
      <Toggle
        size="sm"
        aria-label="Toggle bold"
        onPressedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        aria-label="Toggle italic"
        onPressedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        aria-label="Toggle underline"
        onPressedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
      >
        <Underline className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        aria-label="Toggle code"
        onPressedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
      >
        <Code className="h-4 w-4" />
      </Toggle>
      <div className="w-[1px] h-4 bg-border mx-1" />
      <Toggle
        size="sm"
        aria-label="Toggle bullet list"
        onPressedChange={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        aria-label="Toggle ordered list"
        onPressedChange={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
    </div>
  )
}

export function Plugins() {
  const [_floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null)

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem)
    }
  }

  return (
    <div className="relative flex flex-col justify-between h-full">
      {/* toolbar plugins */}
      <Toolbar />
      <div className="relative flex-1">
        <RichTextPlugin
          contentEditable={
            <div className="">
              <div className="min-h-[150px]" ref={onRef}>
                <ContentEditable
                  placeholder={"Start typing..."}
                />
              </div>
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <ListPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      </div>
      <div className="flex justify-end p-2 border-t">
        <CounterCharacterPlugin />
      </div>
    </div>
  )
}
