import React, { useEffect, useState } from "react";
import './styles.css';
import { useParams } from "react-router-dom";
import axiosInstance from "@/services/api";
import { API_URLS } from "@/services/apiUrls";
import { useRef } from "react";
import { IoCloseSharp } from "react-icons/io5";
import { MdEdit } from "react-icons/md";
import { FaCheck, FaTrash, FaHeart, FaRegHeart } from "react-icons/fa";
import { CiCirclePlus } from "react-icons/ci";
import { Skeleton } from "@/components/ui/skeleton";
import { socket } from '@/utils/sockets';
import { getComponentyByName } from "@/utils/enums";
import ColorPicker from "../projectsUtils/ColorPicker";
import SelectionWrapper from "../projectsUtils/SelectionFrame";
import LoadingIndicatorWrapper from "../projectsUtils/LoadingIndicatorWrapper";
import GeneratedElementHeader from "../projectsUtils/GeneratedElementHeader";
import FloatingToolbarWrapper from "../projectsUtils/FloatingToolbarWrapper";
import { autoResizeGeneric, filterSpecificationsGeneric, handleCancelGeneric, handleCtrlClickSelectGeneric, handleEditGeneric, handleSaveGeneric, handleSpecificationsResponseCancelGeneric, selectColorGeneric, toggleColorPickerGeneric, toggleFavoriteGeneric } from "../projectsUtils/GenericFunctions";
import { useSnackbar } from "notistack";

interface Names {
    id: number;
    name: string;
    isEditing?: boolean;
    color: string;
    isFavorite?: boolean;
    isColorPickerOpen: boolean;
}

const NameList: React.FC = () => {
    const { projectID } = useParams();
    const [names, setNames] = useState<Names[]>([]);
    const [regeneratedNames, setRegeneratedNames] = useState<Names[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
    const [isEditingMode, setIsEditingMode] = useState<boolean>(false);
    const [newCard, setNewCard] = useState(false);
    const [newCardContent, setNewCardContent] = useState({ name: "", color: "", isColorPickerOpen: false, isEditing: false });
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
    const { enqueueSnackbar } = useSnackbar();

    const defaultCardContent = {
        name: "",
        color: "",
        isColorPickerOpen: false,
        isFavorite: false,
        isEditing: false

    };


    // Fetches data from server and appends it by fields for edition, favourites and colors
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`${API_URLS.API_SERVER_URL}/model/title/${projectID}`);
            setNames(
                response.data.names.map((spec: Names, index) => ({
                    id: index,
                    isEditing: false,
                    color: 'bg-white',
                    isFavorite: false,
                    isColorPickerOpen: false,
                    name: spec
                }))
            );
            const x = response.data.names.map((spec: Names, index) => ({
                id: index,
                isEditing: false,
                color: 'bg-white',
                isFavorite: false,
                isColorPickerOpen: false,
                name: spec
            }));
        } catch (error) {
            console.error("Error fetching data:", error);
            enqueueSnackbar(`Error fetching data ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
        } finally {
            setIsLoading(false);

        }
    };

    useEffect(() => {
        fetchData();
        return () => {
            const message = { component: getComponentyByName("title").id }
            socket.emit("finish-edition", message);
            setIsEditingMode(false);
        }
    }, [projectID]);

    // Removes fields not supported by server and sends put request to server
    const handleSaveAllNames = async () => {
        try {
            const preparedNames = names.map((spec) => removeTemporaryProperties(spec));
            updateNamesOnServer(preparedNames, projectID);
        } catch (error) {
            enqueueSnackbar(`Error saving data ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
        }
    };

    const handleAddNewCard = async () => {
        if (newCard) {
            const tempId = names.length ? names[names.length - 1].id + 1 : 1;
            let newSpecification = { id: tempId, ...newCardContent };
            // newSpecification = removeTemporaryProperties(newSpecification);

            const updatedNames = [...names, newSpecification];
            updateNamesState(updatedNames);

            setNewCard(false);
            setNewCardContent(defaultCardContent);
        } else {
            setNewCard(true);
        }
    };

    const handleDelete = async (id, e) => {

        e.stopPropagation();
        try {
            const updatedNames = names.filter((spec) => spec.id !== id);
            updateNamesState(updatedNames);
        } catch (error) {
            enqueueSnackbar(`Error deleting specification: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
        }
    };

    // When new item is genereted by server this funcion handles saving it to local view and server
    const handleNamesResponseSave = (id, event) => {

        event.stopPropagation();
        const newSpecification = regeneratedNames.find((spec) => spec.id === id);

        setRegeneratedNames((prev) =>
            prev.filter((spec) => spec.id !== id)
        );

        if (newSpecification) {
            addSpecificationToState({
                ...newSpecification,
                isEditing: false,
                color: "bg-white",
                isFavorite: false,
                isColorPickerOpen: false,
            });
        }
    };

    // Sends update request to server, it passes context in form of every name that was selected
    const handleUpdateRequest = (textareaChatValue) => {

        const filteredNames = filterNames(names, selectedItems);
        const payload = {
            component_val: { names: filteredNames },
            query: textareaChatValue,
            ai_model: "gpt-35-turbo",
        };

        sendAIRequest("ai-update", payload, (data) => {
            setRegeneratedNames(
                data.names.map((spec, index) => ({
                    ...spec,
                    id: index,
                }))
            );
        });
    };

    // Sends regenerate request to server, it passes context in form of every name that was selected
    const handleRegenerateRequest = (textareaInfoValue) => {
        const filteredNames = filterNames(names, selectedItems);
        const payload = {
            details: `${textareaInfoValue} and regenerate me for following elements: \n ${JSON.stringify(filteredNames)}`,
            ai_model: "gpt-35-turbo",
        };

        sendAIRequest("ai-regenerate", payload, (data) => {
            setRegeneratedNames(
                data.names.map((spec, index) => ({
                    ...spec,
                    id: index,
                }))
            );
        });
    };

    const sendAIRequest = async (endpoint, payload, callback) => {
        try {
            setIsRegenerating(true);
            const response = await axiosInstance.post(`${API_URLS.API_SERVER_URL}/model/title/${endpoint}`, payload);
            callback(response.data);
        } catch (error) {
            enqueueSnackbar(`Error sending request to ${endpoint}: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
            console.error(`Error sending request to ${endpoint}:`, error);
        } finally {
            setIsRegenerating(false);
        }
    };

    // ----------------UTILS---------------

    const updateNamesOnServer = async (updatedNames, projectID) => {

        try {
            const preparedNames = updatedNames.map((spec) => removeTemporaryProperties(spec));
            const body = {
                project_id: projectID,
                new_val: {
                    names: preparedNames,
                },
            };
            await axiosInstance.put(`${API_URLS.API_SERVER_URL}/model/title/update`, body);
        } catch (error) {
            console.error("Error updating names on server:", error);
            enqueueSnackbar(`Error updating names on server: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
            throw error;
        }
    };

    const addSpecificationToState = (newSpecification) => {
        const updatedNames = [
            ...names,
            { ...newSpecification, id: names.length },
        ];
        setNames(updatedNames);
        updateNamesOnServer(updatedNames, projectID);
    };

    const updateNamesState = (updatedNames) => {
        setNames(updatedNames);
        updateNamesOnServer(updatedNames, projectID);
    };

    const removeTemporaryProperties = (nameProp) => { //TODO: modify backend too accept color, icon
        const { name, id, color, isColorPickerOpen, isEditing, isFavorite } = nameProp;
        return name != undefined ? name : ""
    };

    // ----------------OVERLOADED---------------

    const handleSave = async (id: number, e: React.MouseEvent) => {
        handleSaveGeneric(id, e, names, setNames, handleSaveAllNames);
    };

    const handleEdit = (id: number, e: React.MouseEvent) => {
        handleEditGeneric(id, e, setNames)
    };

    const handleCancel = (id: number, e: React.MouseEvent) => {
        handleCancelGeneric(id, e, setNames);
    };

    const toggleFavorite = (id: number, e: React.MouseEvent) => {
        toggleFavoriteGeneric(id, e, setNames);
    };

    const toggleColorPicker = (id: number, e: React.MouseEvent) => {
        toggleColorPickerGeneric(id, e, setNames);
    };

    const selectColor = (color: string, nameId: number) => {
        selectColorGeneric(color, nameId, setNames);
    };

    const autoResize = (e: React.FormEvent<HTMLTextAreaElement>, id: number) => {
        autoResizeGeneric(e, id, textareaRefs);
    };

    const handleCtrlClickSelect = (specId: number, event: React.MouseEvent) => {
        const isEditing = names[specId]?.isEditing != undefined ? names[specId]?.isEditing : false
        handleCtrlClickSelectGeneric(specId, event, isEditing, setSelectedItems);
    };

    const handleNamesResponseCancel = (id, event) => {
        handleSpecificationsResponseCancelGeneric(id, setNames);
    };

    // This returns only those which are selected
    const filterNames = (names, selectedItems) => {
        filterSpecificationsGeneric(names, selectedItems, removeTemporaryProperties);
    };

    if (isLoading) {
        return (
            <div className="flex flex-wrap justify-center items-start gap-4 p-4 relative">
                {Array.from({ length: 15 }).map((_, index) => (
                    <Skeleton key={index} className="h-32 w-full m-2 max-w-lg" />
                ))}
            </div>
        )
    }

    return (
        <div className="h-screen">
            <FloatingToolbarWrapper
                socket={socket}
                setIsEditingMode={setIsEditingMode}
                selectedItems={selectedItems}
                handleRegenerateRequest={handleRegenerateRequest}
                handleUpdateRequest={handleUpdateRequest}
                componentName={"title"}
            />
            <LoadingIndicatorWrapper isLoading={isRegenerating} />

            <SelectionWrapper
                setSelectedItems={setSelectedItems}
                specifications={names}
                containerRef={containerRef}
            >
                <GeneratedElementHeader
                    title="Project Names"
                    description="Manage and customize the names of your project"
                />
                <div ref={containerRef} className="flex flex-wrap justify-center items-start gap-4 p-4 relative">
                    {regeneratedNames.length != 0 ?
                        (
                            regeneratedNames.map((name, index) => (
                                <div
                                    key={name.id + 1000}
                                    className={`tmp max-w-lg w-full px-4 pt-4  border rounded-lg  relative `}
                                >
                                    <div className="flex flex-row w-full justify-end mb-2" >
                                        <span className="text-green-600 text-sm absolute top-2 left-2 flex items-center justify-center">
                                            <p className="font-semibold w-5 h-5 flex justify-center items-center rounded-br-md mr-1">New</p>
                                        </span>
                                        <div className="flex absolute top-1 right-2 justify-end gap-2 mt-4">
                                            <FaCheck
                                                className="w-5 h-5 text-green-500 cursor-pointer"
                                                title="Save"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleNamesResponseSave(name.id, e)
                                                }}
                                            />
                                            <IoCloseSharp
                                                className="w-5 h-5 text-red-500 cursor-pointer"
                                                title="Cancel"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleNamesResponseCancel(name.id, e)
                                                }
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4" >
                                        <p className="mt-4 text-base text-gray-700 flex items-center gap-2">
                                            {name.name}
                                        </p>
                                    </div>

                                </div>
                            ))
                        ) : (<></>)
                    }
                    {names.map((name, index) => (
                        <div
                            key={name.id}
                            onClick={(e) => !name.isEditing ? handleCtrlClickSelect(name.id, e) : setSelectedItems([])}

                            className={`max-w-lg w-full px-4 pt-4 border rounded-lg shadow-md ${(selectedItems.includes(name.id) && !name.isEditing) ? "bg-blue-100" : name.color}  ${name.isFavorite ? "shadow-xl border-2 border-green-500" : ""}  relative`}
                        >
                            <div className="flex justify-beetwen items-center mb-2" onClick={(e) => {
                                e.stopPropagation();
                            }}>
                                <span className="text-gray-800 text-sm absolute top-1 left-2 flex items-center justify-center">
                                    <p className="font-semibold w-5 h-5 flex justify-center items-center rounded-br-md mr-1">{index + 1}</p>
                                    <div className="flex items-center justify-center" style={{ paddingTop: "2px" }} onClick={(e) => {
                                        toggleFavorite(name.id, e);
                                    }} >
                                        {isEditingMode && (
                                            name.isFavorite ? (
                                                <FaHeart className="w-5 h-5 text-red-500 cursor-pointer" />
                                            ) : (
                                                <FaRegHeart className="w-5 h-5 text-gray-400 cursor-pointer" />
                                            )
                                        )}

                                    </div>
                                </span>
                                <div
                                    className="flex gap-2 w-full flex items-center justify-end"
                                    onClick={(e) => isEditingMode && name.isEditing && e.stopPropagation()}
                                >
                                    {isEditingMode && name.isEditing ? (
                                        <>

                                            <ColorPicker
                                                isOpen={name.isColorPickerOpen}
                                                currentColor={name.color}
                                                onToggle={(e) => toggleColorPicker(name.id, e)}
                                                onSelectColor={(color) => selectColor(color, name.id)}
                                            />

                                            <FaCheck
                                                className="w-5 h-5 text-green-500 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSave(name.id, e);
                                                }}
                                            />
                                            <IoCloseSharp
                                                className="w-5 h-5 text-red-500 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCancel(name.id, e);
                                                }}
                                            />
                                        </>
                                    ) : (
                                        isEditingMode && (
                                            <>
                                                <MdEdit
                                                    className="w-5 h-5 text-gray-400 cursor-pointer"
                                                    onClick={(e) => handleEdit(name.id, e)}
                                                />
                                                <FaTrash
                                                    className="w-4 h-4 text-red-500 cursor-pointer"
                                                    onClick={(e) => handleDelete(name.id, e)}
                                                />
                                            </>
                                        )
                                    )}
                                </div>
                            </div>
                            <div className="mb-4" onClick={(e) => {
                                e.stopPropagation();
                            }}>
                                {name.isEditing ? (
                                    <>
                                        <textarea
                                            ref={(el) => (textareaRefs.current[name.id] = el)}
                                            className="w-full mt-2 rounded-md p-2 bg-transparent resize-none shrink-0"
                                            value={name.name}

                                            rows={4}
                                            onChange={(e) => {
                                                const { value } = e.target;
                                                setNames((prevNames) =>
                                                    prevNames.map((spec) =>
                                                        spec.id === name.id
                                                            ? { ...spec, name: value }
                                                            : spec
                                                    )
                                                );
                                            }}
                                            onClick={(e) => { e.stopPropagation(); }}
                                            onInput={(e) => autoResize(e, name.id)}
                                            onBlur={(e) => handleSave(name.id, e)}
                                        />
                                    </>
                                ) : (
                                    <p className="mt-4 text-base text-gray-700 flex items-center gap-2">
                                        {name.name}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                    {newCard ? (
                        <div className={`max-w-lg w-full p-4 border rounded-lg border-dashed border-gray-300 shadow-md relative ${newCardContent.color}`}>
                            <div className="flex gap-2 w-full flex items-center justify-end">
                                <ColorPicker
                                    isOpen={isColorPickerOpen}
                                    currentColor={newCardContent.color}
                                    onToggle={(e) => setIsColorPickerOpen(!isColorPickerOpen)}
                                    onSelectColor={(color) => {
                                        setNewCardContent({ ...newCardContent, color });
                                        setIsColorPickerOpen(false);
                                    }} />
                                <FaCheck
                                    className="w-5 h-5 text-green-500 cursor-pointer"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        handleAddNewCard();
                                    }} />
                                <IoCloseSharp
                                    className="w-5 h-5 text-red-500 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setNewCard(false);
                                        setNewCardContent({
                                            name: "",
                                            color: "",
                                            isColorPickerOpen: false,
                                            isFavorite: false
                                        });
                                    }} />
                            </div>
                            <textarea
                                ref={(el) => (textareaRefs.current[-1] = el)}
                                className="w-full mt-2 rounded-md p-2 bg-transparent resize-none shrink-0"
                                placeholder="New Specification Description"
                                value={newCardContent.name}
                                onInput={(e) => autoResize(e, -1)}
                                onBlur={(e) => setNewCardContent({ ...newCardContent, name: e.target.value })}
                                onChange={(e) => setNewCardContent({ ...newCardContent, name: e.target.value })}
                            />
                        </div>
                    ) : (
                        isEditingMode ? (
                            <div
                                className="max-w-lg w-full p-4 border-dashed border-2 border-gray-300 flex items-center justify-center cursor-pointer rounded-lg"
                                onClick={(e) => { e.stopPropagation(); setNewCard(true); }}
                            >
                                <CiCirclePlus className="w-8 h-8 text-gray-400" />
                            </div>
                        ) : (<></>))}
                </div>
            </SelectionWrapper>
        </div>
    );
};


export default NameList;
