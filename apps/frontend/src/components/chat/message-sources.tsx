"use client"

import * as React from "react"
import { Source } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpenIcon } from 'lucide-react'

interface MessageSourcesProps {
  sources: Source[];
}

export function MessageSources({ sources }: MessageSourcesProps) {
  return (
    <Card className="mt-3 bg-background/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BookOpenIcon className="h-4 w-4" />
          参照文書
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sources.map((source, index) => (
          <div key={index} className="border-l-2 border-primary/20 pl-3 py-2">
            <div className="font-medium text-sm">{source.title}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {source.excerpt}
            </div>
            <div className="flex items-center justify-between mt-2">
              {source.category && (
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                  {source.category}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                関連度: {(source.score * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}