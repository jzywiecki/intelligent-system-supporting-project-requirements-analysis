import { useRef } from "react";
import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { PiPaperPlaneRightFill } from "react-icons/pi";
import { IoCloseSharp } from "react-icons/io5";

interface InfoButtonProps {
    setIsRegenerateChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isRegenerateChatOpen: boolean;
    handleRegenerateRequest: any;
    setTextareaValue: React.Dispatch<React.SetStateAction<string>>;
    textareaValue: string;
    selectedItems: any;
}

const InfoButton: React.FC<InfoButtonProps> = React.memo(({
    setIsRegenerateChatOpen,
    isRegenerateChatOpen,
    handleRegenerateRequest,
    setTextareaValue,
    textareaValue,
    selectedItems
}) => {
    const positionRefInfo = useRef({ x: 0, y: 0 });

    const isDraggingInfo = useRef(false);

    const infoRef = useRef(null);


    const handleMouseDown = (e) => {
        if (infoRef.current && infoRef.current.contains(e.target)) {
            isDraggingInfo.current = true;
            infoRef.current.startX = e.clientX - positionRefInfo.current.x;
            infoRef.current.startY = e.clientY - positionRefInfo.current.y;
            document.addEventListener("mousemove", handleMouseMoveInfo);
            document.addEventListener("mouseup", handleMouseUpInfo);
        }
    };

    const handleMouseMoveInfo = (e) => {
        if (isDraggingInfo.current && infoRef.current && infoRef.current.parentElement) {
            const regenWidth = infoRef.current.offsetWidth;
            const regenHeight = infoRef.current.offsetHeight;
            const parentWidth = infoRef.current.parentElement.offsetWidth;
            const parentHeight = infoRef.current.parentElement.offsetHeight;

            let newX = e.clientX - infoRef.current.startX;
            let newY = e.clientY - infoRef.current.startY;

            newX = Math.max(-(parentWidth - regenWidth - 20), Math.min(newX, regenWidth));
            newY = Math.max(-(parentHeight - regenHeight - 176), Math.min(newY, 2 * regenHeight));

            positionRefInfo.current = { x: newX, y: newY };
            infoRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
        }
    };

    const handleMouseUpInfo = () => {
        isDraggingInfo.current = false;
        document.removeEventListener("mousemove", handleMouseMoveInfo);
        document.removeEventListener("mouseup", handleMouseUpInfo);
    };
    if (!isRegenerateChatOpen) {
        return (<></>)
    }

    return (
        <div
            className="absolute right-5 bottom-44 z-50 flex flex-row bg-white rounded-md shadow-lg"
            style={{
                position: "absolute",
                transform: `translate(${positionRefInfo.current.x}px, ${positionRefInfo.current.y}px)`,
            }}
            ref={infoRef}
            onMouseDown={handleMouseDown}
            onClick={(e) => { e.stopPropagation(); }}
        >

            <div className="flex flex-col justify-between p-1.5 bg-gray-200">
                <div className="h-[30%] hover:text-red-500 cursor-pointer">
                    <IoCloseSharp onClick={() => {
                        setIsRegenerateChatOpen(false)
                    }} size={20} />
                </div>
                <div className="flex items-center justify-center h-[60%] bg-black text-white rounded-md">
                    <PiPaperPlaneRightFill onClick={() => handleRegenerateRequest()} size={15} />
                </div>
            </div>
            <Textarea
                placeholder={
                    selectedItems.length > 0
                        ? "Write what to regenerate. Applicable to elements: " +
                        Array.from(new Set(selectedItems))
                            .map(num => num + 1)
                            .sort((a, b) => a - b)
                            .join(", ")
                        : "Write what to regenerate."
                }
                value={textareaValue}
                onChange={(e) => setTextareaValue(e.target.value)}
            />
        </div>
    );
});

export default InfoButton;
