import { useState, } from "react";
import React from 'react';
import ChatButton from './ChatButton';
import InfoButton from './InfoButton';
import FloatingToolbar from './FloatingToolbar';

interface FloatingToolbarProps {
    socket: any;
    setIsEditingMode: React.Dispatch<React.SetStateAction<boolean>>;
    selectedItems: any;
    handleRegenerateRequest: (value: string) => void;
    handleUpdateRequest: (value: string) => void;
    componentName: string;
}

const FloatingToolbarWrapper: React.FC<FloatingToolbarProps> = React.memo(({
    socket,
    setIsEditingMode,
    selectedItems,
    handleUpdateRequest,
    handleRegenerateRequest,
    componentName
}) => {

    const [isRegenerateChatOpen, setIsRegenerateChatOpen] = useState<boolean>(false);
    const [isUpdateChatOpen, setIsUpdateChatOpen] = useState<boolean>(false);
    const [textareaChatValue, setChatTextareaValue] = useState("");
    const [textareaInfoValue, setInfoTextareaValue] = useState("");

    return (
        <>
            <ChatButton
                setIsUpdateChatOpen={setIsUpdateChatOpen}
                isUpdateChatOpen={isUpdateChatOpen}
                handleUpdateRequest={(value: string) => handleUpdateRequest(value)}
                setTextareaValue={setChatTextareaValue}
                textareaValue={textareaChatValue}
                selectedItems={selectedItems}
            />
            <InfoButton
                setIsRegenerateChatOpen={setIsRegenerateChatOpen}
                isRegenerateChatOpen={isRegenerateChatOpen}
                handleRegenerateRequest={(value: string) => handleRegenerateRequest(value)}
                setTextareaValue={setInfoTextareaValue}
                textareaValue={textareaInfoValue}
                selectedItems={selectedItems}
            />
            <FloatingToolbar
                socket={socket}
                setIsEditingMode={setIsEditingMode}
                setIsRegenerateChatOpen={setIsRegenerateChatOpen}
                setIsUpdateChatOpen={setIsUpdateChatOpen}
                componentName={componentName}
            /></>
    )

});
export default FloatingToolbarWrapper;
