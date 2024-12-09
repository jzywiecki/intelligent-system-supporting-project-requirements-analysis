import React from "react";
import { TfiPaintBucket } from "react-icons/tfi";

type ColorOption = { color: string; label: string };

const ColorPicker: React.FC<{
    isOpen: boolean;
    currentColor: string;
    onToggle: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    onSelectColor: (color: string) => void;
    colorOptions?: ColorOption[];
}> = ({ isOpen, currentColor, onToggle, onSelectColor, colorOptions }) => {

    const defaultColorOptions = [
        { color: "bg-red-300", label: "Red" },
        { color: "bg-blue-300", label: "Blue" },
        { color: "bg-green-300", label: "Green" },
        { color: "bg-yellow-300", label: "Yellow" },
        { color: "bg-purple-300", label: "Purple" },
        { color: "bg-white", label: "White" },
    ];

    const options = colorOptions || defaultColorOptions;

    return (
        <div
            className="relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
        >
            <button
                type="button"
                className={`w-7 h-7 ${currentColor} text-gray-500`}
                onClick={onToggle}
            >
                <TfiPaintBucket />
            </button>
            {isOpen && (
                <div className="absolute mt-2 w-32 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="grid grid-cols-3 gap-2 p-2">
                        {options.map(({ color, label }) => (
                            <div
                                key={label}
                                className={`w-5 h-5 shadow-[0_0_5px_1px_rgb(228,228,228)] rounded-sm border border-gray-200 cursor-pointer ${color}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectColor(color);
                                }}
                                title={label}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ColorPicker;
