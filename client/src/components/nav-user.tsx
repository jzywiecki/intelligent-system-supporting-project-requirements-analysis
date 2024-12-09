"use client"

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Link, useNavigate } from "react-router-dom"
import InviteModal from "./InviteModal"
import Search from "./Search"
import { useState } from "react"
import Image from "./Image"


import { API_URLS } from "@/services/apiUrls";
import axiosInstance from "@/services/api";
import { useUser } from "./UserProvider"

export function NavUser({
  userInfo,
  onSearch,
  searchResults,
  friends,
  userId,
  projectID
}: {
  userInfo: {
    name: string
    email: string
    avatar: string
  },
  onSearch?: (query: string) => void,
  searchResults?: any[],
  friends?: any[],
  userId?: string,
  projectID?: string
}) {
  const { isMobile } = useSidebar()
  const [isInviteModalOpen, setInviteModalOpen] = useState(false)
  const navigate = useNavigate();
  const { user } = useUser();

  const handleAddMember = async (friendId: string) => {
    try {
      const url = `${API_URLS.API_SERVER_URL}/projects/${projectID}/members/add`;
      if (userId != null && userId != undefined && userId != "") {
        await axiosInstance.post(url, { sender_id: userId, member_id: friendId });
      }
      setInviteModalOpen(false);
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const toggleInviteModal = () => {
    setInviteModalOpen(!isInviteModalOpen)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
              <Image imageURL={userInfo.avatar} alt={userInfo.name} />
              <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{userInfo.name}</span>
                <span className="truncate text-xs">{userInfo.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                <Image imageURL={userInfo.avatar} alt={userInfo.name} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{userInfo.name}</span>
                  <span className="truncate text-xs">{userInfo.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate(`/profile/${user.id}`)}>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleInviteModal}>
                <Bell />
                <span>Invite</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/projects" style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                <LogOut color="red" />
                <p style={{ color: "red" }}>Exit</p>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <InviteModal isOpen={isInviteModalOpen} onClose={toggleInviteModal}>
          <Search
            onSearch={onSearch}
            searchResults={searchResults}
            friends={friends}
            onClick={handleAddMember}
            userId={userId}
            actionType="addMember"
          />
        </InviteModal>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
