import { MouseEvent, FormEvent } from 'react';


export const handleSaveGeneric = async <T extends { id: number; isEditing?: boolean }>(
    id: number,
    e: React.MouseEvent,
    items: T[],
    setState: React.Dispatch<React.SetStateAction<T[]>>,
    handleSaveAllItems: () => Promise<void>
) => {
    e.stopPropagation();
    const itemToSave = items.find((item) => item.id === id);
    if (!itemToSave) return;

    setState((prevState) =>
        prevState.map((item) =>
            item.id === id ? { ...item, isEditing: false } : item
        )
    );

    await handleSaveAllItems();
};


export const handleEditGeneric = <T extends { id: number; isEditing?: boolean }>(
    id: number,
    e: MouseEvent,
    setState: React.Dispatch<React.SetStateAction<T[]>>
) => {
    e.stopPropagation();
    setState((prevState) =>
        prevState.map((item) =>
            item.id === id ? { ...item, isEditing: true } : { ...item, isEditing: false }
        )
    );
};

export const handleCancelGeneric = <T extends { id: number; isEditing?: boolean }>(
    id: number,
    e: MouseEvent,
    setState: React.Dispatch<React.SetStateAction<T[]>>
) => {
    e.stopPropagation();
    setState((prevState) =>
        prevState.map((item) =>
            item.id === id ? { ...item, isEditing: false } : item
        )
    );
};

export const toggleFavoriteGeneric = <T extends { id: number; isFavorite?: boolean }>(
    id: number,
    e: MouseEvent,
    setState: React.Dispatch<React.SetStateAction<T[]>>
) => {
    e.stopPropagation();
    setState((prevState) =>
        prevState.map((item) =>
            item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
        )
    );
};

export const toggleColorPickerGeneric = <T extends { id: number; isColorPickerOpen?: boolean }>(
    id: number,
    e: MouseEvent,
    setState: React.Dispatch<React.SetStateAction<T[]>>
) => {
    e.stopPropagation();
    setState((prevState) =>
        prevState.map((item) =>
            item.id === id
                ? { ...item, isColorPickerOpen: !item.isColorPickerOpen }
                : { ...item, isColorPickerOpen: false }
        )
    );
};

export const selectColorGeneric = <T extends { id: number; color?: string; isColorPickerOpen?: boolean }>(
    color: string,
    id: number,
    setState: React.Dispatch<React.SetStateAction<T[]>>
) => {
    setState((prevState) =>
        prevState.map((item) =>
            item.id === id ? { ...item, color, isColorPickerOpen: false } : item
        )
    );
};

export const autoResizeGeneric = (
    e: FormEvent<HTMLTextAreaElement>,
    id: number,
    textareaRefs: React.RefObject<Record<number, HTMLTextAreaElement>>
) => {
    const textarea = textareaRefs.current?.[id];
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
};

export const handleCtrlClickSelectGeneric = (
    id: number,
    event: MouseEvent,
    isEditing: boolean,
    setSelectedItems: React.Dispatch<React.SetStateAction<number[]>>
) => {
    if (event.button !== 0 || isEditing) return;

    setSelectedItems((prevSelected) => [...prevSelected, id]);
};

export const handleSpecificationsResponseCancelGeneric = <T extends { id: number }>(
    id: number,
    setState: React.Dispatch<React.SetStateAction<T[]>>
) => {
    setState((prevState) => prevState.filter((item) => item.id !== id));
};

export const filterSpecificationsGeneric = <T extends { id: number }>(
    specifications: T[],
    selectedItems: number[],
    removeTemporaryProperties: (item: T) => T
): T[] => {
    return specifications
        .filter((item) => selectedItems.includes(item.id))
        .map(removeTemporaryProperties);
};
