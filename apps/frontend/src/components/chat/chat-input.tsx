"use client"

import * as React from "react"
import { useChatStore } from '@/store/chat-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SendIcon } from 'lucide-react'

export function ChatInput() {
  const [query, setQuery] = React.useState('');
  const { sendMessage, isLoading } = useChatStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const message = query.trim();
    setQuery('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="法律に関する質問を入力してください..."
        className="min-h-[50px] resize-none"
        disabled={isLoading}
      />
      <Button 
        type="submit" 
        disabled={!query.trim() || isLoading}
        className="shrink-0 px-4"
      >
        <SendIcon className="h-4 w-4" />
        <span className="sr-only">送信</span>
      </Button>
    </form>
  )
}