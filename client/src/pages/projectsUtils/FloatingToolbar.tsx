import UserAvatars from './UserAvatars';
import { useEffect, useRef, useState, } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LuPocketKnife } from "react-icons/lu";
import { Separator } from "@/components/ui/separator";
import { MdOutlineSwitchAccessShortcutAdd } from "react-icons/md";
import { FaEdit } from "react-icons/fa";
import { FiSave } from "react-icons/fi";
import { useUser } from '@/components/UserProvider';
import React from 'react';
import axiosInstance from '@/services/api';
import { API_URLS } from '@/services/apiUrls';
import { getComponentyByName } from '@/utils/enums';
import { useParams } from 'react-router-dom';
import { useUserEdits } from './UserEditsProvider';

interface Members {
    username: string;
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
}

interface FloatingToolbarProps {
    socket: any;
    setIsEditingMode: React.Dispatch<React.SetStateAction<boolean>>;
    setIsRegenerateChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsUpdateChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
    componentName: string;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = React.memo(({
    socket,
    setIsEditingMode,
    setIsRegenerateChatOpen,
    setIsUpdateChatOpen,
    componentName
}) => {
    const { projectID } = useParams();
    const { componentUserMap } = useUserEdits();

    const positionRef = useRef({ x: 0, y: 0 });

    const toolbarRef = useRef(null);
    const isDragging = useRef(false);

    const handleEditButtonClick = () => {
        const message = { component: getComponentyByName(componentName).id }
        socket.emit("edit-component", message);
        setIsEditingMode(true);
        console.log("elo")

    };

    const handleEditSaveButtonClick = () => {
        const message = { component: getComponentyByName(componentName).id }
        socket.emit("finish-edition", message);
        setIsEditingMode(false);
        setIsRegenerateChatOpen(false);
        setIsUpdateChatOpen(false);
    };

    const { user } = useUser();

    const [allMembers, setAllMembers] = useState<Members[]>([]);
    const [usersEditing, setUsersEditing] = useState([]);

    useEffect(() => {
        const fetchAndUpdateUsers = async () => {
            try {
                setUsersEditing([]);
                setAllMembers([])
                const membersResponse = await axiosInstance.get(
                    `${API_URLS.BASE_URL}/users/projects/${projectID}`
                );
                const usersData = membersResponse.data as Members[];
                setAllMembers(usersData);

                const specificationsUsers = componentUserMap[getComponentyByName(componentName).id] || [];
                const specificationsUsersArray = [...specificationsUsers];

                const updatedUsersEditing = usersData
                    .filter((user) => specificationsUsersArray.includes(user.id))
                    .map((user) => ({
                        avatarUrl: user.avatarurl || `https://www.pikpng.com/pngl/m/16-168770_user-iconset-no-profile-picture-icon-circle-clipart.png`,
                        name: user.username,
                    }));

                setUsersEditing(updatedUsersEditing);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchAndUpdateUsers();

    }, [componentUserMap, projectID]);

    const handleMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (toolbarRef.current && toolbarRef.current.contains(e.target)) {

            isDragging.current = true;
            toolbarRef.current.startX = e.clientX - positionRef.current.x;
            toolbarRef.current.startY = e.clientY - positionRef.current.y;

            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }
    };


    const handleMouseMove = (e) => {
        if (isDragging.current && toolbarRef.current && toolbarRef.current.parentElement) {
            const toolbarWidth = toolbarRef.current.offsetWidth;
            const toolbarHeight = toolbarRef.current.offsetHeight;
            const parentWidth = toolbarRef.current.parentElement.offsetWidth;
            const parentHeight = toolbarRef.current.parentElement.offsetHeight;

            let newX = e.clientX - toolbarRef.current.startX;
            let newY = e.clientY - toolbarRef.current.startY;

            newX = Math.max(-(parentWidth - toolbarWidth - 20), Math.min(newX, toolbarWidth));
            newY = Math.max(-(parentHeight - toolbarHeight - 30), Math.min(newY, toolbarHeight));

            positionRef.current = { x: newX, y: newY };
            toolbarRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
        }
    };




    const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
    };

    return (
        // <div style={{ background: "red", width: "100%", position: "absolute", height: "100vh", zIndex: "100" }} onClick={(e) => {
        // e.stopPropagation();

        // }}>

        <div
            className="toolbar-container flex items-center space-x-4"
            style={{
                position: "absolute",
                transform: `translate(${positionRef.current.x}px, ${positionRef.current.y}px)`,
                height: "fit-content"
            }}
            ref={toolbarRef}
            onMouseDown={handleMouseDown}
            onClick={(e) => {
                e.stopPropagation();
            }}>
            {usersEditing.length > 0 ? (
                <UserAvatars usersEditing={usersEditing} currentUser={{ name: user.username, avatarUrl: user.avatarurl }} />
            ) : null}
            {usersEditing.length > 0 ? <Separator orientation="vertical" className="h-5" /> : null}

            {usersEditing.length > 0 ? (
                <div className="toolbar" onClick={(e) => { e.stopPropagation(); }}>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <LuPocketKnife onClick={() => {
                                    setIsUpdateChatOpen((prev) => !prev)
                                }} size={25} />
                            </TooltipTrigger>
                            <TooltipContent>Update with AI</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger>
                                <MdOutlineSwitchAccessShortcutAdd onClick={() => {
                                    setIsRegenerateChatOpen((prev) => !prev)
                                }} size={25} />
                            </TooltipTrigger>
                            <TooltipContent>Regenerate with AI</TooltipContent>
                        </Tooltip>


                        <Tooltip>
                            <TooltipTrigger>
                                <FiSave onClick={() => handleEditSaveButtonClick()} size={25} />
                            </TooltipTrigger>
                            <TooltipContent>Save</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            ) : (
                <div className="edit-button" onClick={() => handleEditButtonClick()}>
                    <FaEdit size={25} />
                </div>
            )}
        </div>)
    // </div>

});
export default FloatingToolbar;
