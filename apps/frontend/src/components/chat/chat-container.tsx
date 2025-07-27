"use client"

import * as React from "react"
import { useChatStore } from '@/store/chat-store'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { SearchFilters } from './search-filters'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ChatContainer() {
  const { messages, isLoading } = useChatStore();

  return (
    <div className="flex flex-1 flex-col gap-4 rounded-lg border bg-background p-4">
      <SearchFilters />
      
      <div className="flex-1 space-y-4 overflow-hidden">
        <ScrollArea className="h-full">
          <MessageList messages={messages} isLoading={isLoading} />
        </ScrollArea>
      </div>
      
      <div className="border-t pt-4">
        <ChatInput />
      </div>
    </div>
  )
}