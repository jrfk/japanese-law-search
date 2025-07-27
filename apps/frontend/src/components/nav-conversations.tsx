"use client"

import * as React from "react"
import { MessageSquareIcon, ClockIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

// Mock conversation data - this will be replaced with real data later
const conversations = [
  {
    id: "1",
    title: "憲法第9条について",
    preview: "憲法第9条について教えて",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: "2", 
    title: "民法の契約に関する条文",
    preview: "民法の契約に関する条文は？",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
]

export function NavConversations() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>会話履歴</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {conversations.map((conversation) => (
            <SidebarMenuItem key={conversation.id}>
              <SidebarMenuButton tooltip={conversation.title}>
                <MessageSquareIcon className="h-4 w-4" />
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="text-sm font-medium truncate w-full">
                    {conversation.title}
                  </span>
                  <span className="text-xs text-muted-foreground truncate w-full">
                    {conversation.preview}
                  </span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  {getRelativeTime(conversation.timestamp)}
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return "今";
  if (diffInMinutes < 60) return `${diffInMinutes}分前`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}時間前`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}日前`;
  
  return date.toLocaleDateString('ja-JP');
}