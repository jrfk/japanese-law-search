"use client"

import * as React from "react"
import { Message } from '@/lib/types'
import { MessageBubble } from './message-bubble'
import { LoadingMessage } from './loading-message'

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="space-y-4 p-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg bg-muted p-3">
            <p className="text-sm">
              こんにちは！日本の法律文書について質問してください。<br />
              例：「憲法第9条について教えて」「民法の契約に関する条文は？」
            </p>
          </div>
        </div>
      )}
      
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      
      {isLoading && <LoadingMessage />}
      
      <div ref={messagesEndRef} />
    </div>
  )
}