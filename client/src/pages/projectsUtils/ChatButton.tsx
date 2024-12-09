import { useRef } from "react";
import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { PiPaperPlaneRightFill } from "react-icons/pi";
import { IoCloseSharp } from "react-icons/io5";

interface ChatButtonProps {
    setIsUpdateChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isUpdateChatOpen: boolean;
    handleUpdateRequest: any;
    setTextareaValue: React.Dispatch<React.SetStateAction<string>>;
    textareaValue: string;
    selectedItems: any;
}


const ChatButton: React.FC<ChatButtonProps> = React.memo(({
    setIsUpdateChatOpen,
    isUpdateChatOpen,
    handleUpdateRequest,
    setTextareaValue,
    textareaValue,
    selectedItems
}) => {
    const positionRefChat = useRef({ x: 0, y: 0 });
    const isDraggingChat = useRef(false);

    const chatRef = useRef(null);


    const handleMouseDown = (e) => {
        if (chatRef.current && chatRef.current.contains(e.target)) {
            isDraggingChat.current = true;
            chatRef.current.startX = e.clientX - positionRefChat.current.x;
            chatRef.current.startY = e.clientY - positionRefChat.current.y;
            document.addEventListener("mousemove", handleMouseMoveChat);
            document.addEventListener("mouseup", handleMouseUpChat);
        }
    };

    const handleMouseMoveChat = (e) => {
        if (isDraggingChat.current && chatRef.current && chatRef.current.parentElement) {
            const chatWidth = chatRef.current.offsetWidth;
            const chatHeight = chatRef.current.offsetHeight;
            const parentWidth = chatRef.current.parentElement.offsetWidth;
            const parentHeight = chatRef.current.parentElement.offsetHeight;

            let newX = e.clientX - chatRef.current.startX;
            let newY = e.clientY - chatRef.current.startY;

            newX = Math.max(-(parentWidth - chatWidth - 20), Math.min(newX, chatWidth));
            newY = Math.max(-(parentHeight - chatHeight - 30), Math.min(newY, chatHeight));

            positionRefChat.current = { x: newX, y: newY };
            chatRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
        }
    };

    const handleMouseUpChat = () => {
        isDraggingChat.current = false;
        document.removeEventListener("mousemove", handleMouseMoveChat);
        document.removeEventListener("mouseup", handleMouseUpChat);
    };

    if (!isUpdateChatOpen) {
        return (<></>)
    }

    return (
        <div
            className="absolute right-5 bottom-20 z-50 flex flex-row bg-white rounded-md shadow-lg"
            style={{
                transform: `translate(${positionRefChat.current.x}px, ${positionRefChat.current.y}px)`,
            }}
            ref={chatRef}
            onMouseDown={handleMouseDown}
            onClick={(e) => { e.stopPropagation(); }}
        >
            <div className="flex flex-col justify-between p-1.5 bg-gray-200">
                <div className="h-[30%] hover:text-red-500 cursor-pointer">
                    <IoCloseSharp onClick={() => {
                        setIsUpdateChatOpen(false)
                    }} size={20} />
                </div>
                <div className="flex items-center justify-center h-[60%] bg-black text-white rounded-md">
                    <PiPaperPlaneRightFill onClick={() => handleUpdateRequest(textareaValue)} size={15} />
                </div>
            </div>
            <Textarea
                placeholder={
                    selectedItems.length > 0
                        ? "Write what you want to update. Applicable to elements: " +
                        Array.from(new Set(selectedItems))
                            .map(num => num + 1)
                            .sort((a, b) => a - b)
                            .join(", ")
                        : "Write what you want to update."
                }
                value={textareaValue}
                onChange={(e) => setTextareaValue(e.target.value)}
            />
        </div>
    );
});

export default ChatButton;
