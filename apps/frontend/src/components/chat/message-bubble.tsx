"use client"

import * as React from "react"
import { Message } from '@/lib/types'
import { MessageSources } from './message-sources'
import { RelatedQuestions } from './related-questions'

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg p-3 ${
        isUser 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted'
      }`}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {message.sources && message.sources.length > 0 && (
          <MessageSources sources={message.sources} />
        )}
        
        {message.relatedQuestions && message.relatedQuestions.length > 0 && (
          <RelatedQuestions questions={message.relatedQuestions} />
        )}
        
        <div className="mt-2 text-xs opacity-70">
          {message.timestamp.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  )
}