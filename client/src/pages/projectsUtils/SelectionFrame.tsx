import { RefObject, useEffect, useState } from "react";
import React from 'react';


interface SelectionWrapperProps {
    children: React.ReactNode;
    setSelectedItems: React.Dispatch<React.SetStateAction<number[]>>;
    specifications: { id: number }[];
    containerRef: RefObject<HTMLDivElement>;
}

const SelectionWrapper: React.FC<SelectionWrapperProps> = ({
    children,
    setSelectedItems,
    specifications,
    containerRef,
}) => {
    const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
    const [containerOffsetLeft, setContainerOffsetLeft] = useState<number>(0);


    const handleSelectionStart = (event: React.MouseEvent) => {
        if (event.button !== 0) return;
        if (!event.ctrlKey) setSelectedItems([]);
        // if (toolbarRef.current && toolbarRef.current.contains(event.target as Node)) {
        //     return;
        // }

        setSelectionBox({
            startX: event.clientX,
            startY: event.clientY,
            endX: event.clientX,
            endY: event.clientY,
        });
    };

    const handleSelectionEnd = () => {
        if (selectionBox) {
            const selectedIds = specifications.filter((spec, index) => {
                const element = containerRef.current?.children[index] as HTMLElement;
                if (!element) return false;
                // if (specifications[spec.id].isEditing) return false;

                const rect = element.getBoundingClientRect();

                return (
                    rect.left < Math.max(selectionBox.startX - containerOffsetLeft - 1, selectionBox.endX - containerOffsetLeft - 1) &&
                    rect.right > Math.min(selectionBox.startX, selectionBox.endX) &&
                    rect.top < Math.max(selectionBox.startY, selectionBox.endY) &&
                    rect.bottom > Math.min(selectionBox.startY, selectionBox.endY)
                );

            }).map((spec) => spec.id);

            setSelectedItems((prevSelected) => [...new Set([...prevSelected, ...selectedIds])]);
            setSelectionBox(null);
        }
    };


    useEffect(() => {
        if (containerRef.current) {
            setContainerOffsetLeft(containerRef.current.getBoundingClientRect().left);
        }

        const handleResize = () => {
            if (containerRef.current) {
                setContainerOffsetLeft(containerRef.current.getBoundingClientRect().left);
            }
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);

        }
    }, [containerRef.current?.getBoundingClientRect().left]);

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (selectionBox) {
                setSelectionBox(prev => prev && {
                    ...prev,
                    endX: event.clientX,
                    endY: event.clientY
                });
            }
        };

        const handleMouseUp = () => {
            handleSelectionEnd();
        };
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);

        };
    }, [selectionBox, specifications]);




    return (
        <div
            onMouseDown={handleSelectionStart}
            className="relative h-screen"
        >


            {children}



            {selectionBox && (
                <div
                    className="absolute bg-blue-200 opacity-50 border border-blue-500"
                    style={{
                        left: Math.min(selectionBox.startX, selectionBox.endX) - containerOffsetLeft - 1,
                        top: Math.min(selectionBox.startY, selectionBox.endY),
                        width: Math.abs(selectionBox.endX - selectionBox.startX),
                        height: Math.abs(selectionBox.endY - selectionBox.startY),
                    }}
                ></div>
            )}
        </div>
    );
};

export default SelectionWrapper;
