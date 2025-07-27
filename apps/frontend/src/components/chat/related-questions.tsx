"use client"

import * as React from "react"
import { useChatStore } from '@/store/chat-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircleIcon } from 'lucide-react'

interface RelatedQuestionsProps {
  questions: string[];
}

export function RelatedQuestions({ questions }: RelatedQuestionsProps) {
  const sendMessage = useChatStore((state) => state.sendMessage);

  const handleQuestionClick = async (question: string) => {
    await sendMessage(question);
  };

  return (
    <Card className="mt-3 bg-background/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageCircleIcon className="h-4 w-4" />
          関連する質問
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {questions.map((question, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="h-auto p-2 text-left justify-start whitespace-normal"
              onClick={() => handleQuestionClick(question)}
            >
              <span className="text-xs">{question}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}