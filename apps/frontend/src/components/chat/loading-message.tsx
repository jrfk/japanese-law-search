"use client"

import * as React from "react"

export function LoadingMessage() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-lg bg-muted p-3">
        <div className="flex items-center space-x-2">
          <div className="animate-pulse flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="text-sm text-muted-foreground">検索中...</span>
        </div>
      </div>
    </div>
  )
}