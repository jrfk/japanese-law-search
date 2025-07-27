import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { ChatContainer } from "@/components/chat/chat-container"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
              <ChatContainer />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}