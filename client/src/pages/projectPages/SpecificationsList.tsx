import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "@/services/api";
import { API_URLS } from "@/services/apiUrls";
import { IoCloseSharp } from "react-icons/io5";
import { MdEdit } from "react-icons/md";
import { FaCheck, FaTrash, FaHeart, FaRegHeart } from "react-icons/fa";
import { CiCirclePlus } from "react-icons/ci";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";
import { socket } from '@/utils/sockets';
import { getComponentyByName } from "@/utils/enums";
import ColorPicker from "../projectsUtils/ColorPicker";
import SelectionWrapper from "../projectsUtils/SelectionFrame";
import LoadingIndicatorWrapper from "../projectsUtils/LoadingIndicatorWrapper";
import GeneratedElementHeader from "../projectsUtils/GeneratedElementHeader";
import FloatingToolbarWrapper from "../projectsUtils/FloatingToolbarWrapper";
import { autoResizeGeneric, filterSpecificationsGeneric, handleCancelGeneric, handleCtrlClickSelectGeneric, handleEditGeneric, handleSaveGeneric, handleSpecificationsResponseCancelGeneric, selectColorGeneric, toggleColorPickerGeneric, toggleFavoriteGeneric } from "../projectsUtils/GenericFunctions";
import { useSnackbar } from "notistack";

interface Specifications {
    id: number;
    name: string;
    description: string;
    isEditing?: boolean;
    color: string;
    isFavorite?: boolean;
    isColorPickerOpen: boolean;
}

const SpecificationsList: React.FC = () => {
    const { projectID } = useParams();
    const [specifications, setSpecifications] = useState<Specifications[]>([]);
    const [regeneratedSpecifications, setRegeneratedSpecifications] = useState<Specifications[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
    const [isEditingMode, setIsEditingMode] = useState<boolean>(false);
    const [newCard, setNewCard] = useState(false);
    const [newCardContent, setNewCardContent] = useState({ name: "", description: "", color: "", icon: "", isColorPickerOpen: false });
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
    const { enqueueSnackbar } = useSnackbar();

    const defaultCardContent = {
        name: "",
        description: "",
        color: "",
        icon: "",
        isColorPickerOpen: false,
        isFavorite: false,
    };

    // Fetches data from server and appends it by fields for edition, favourites and colors
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`${API_URLS.API_SERVER_URL}/model/specifications/${projectID}`);
            setSpecifications(
                response.data.specifications.map((spec: Specifications, index) => ({
                    ...spec,
                    id: index,
                    isEditing: false,
                    color: 'bg-white',
                    isFavorite: false,
                    isColorPickerOpen: false
                }))
            );
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
            const message = { component: getComponentyByName("specifications").id }
            socket.emit("finish-edition", message);
            setIsEditingMode(false);
        }
    }, [projectID]);

    // Removes fields not supported by server and sends put request to server
    const handleSaveAllSpecifications = async () => {
        try {
            const preparedSpecifications = specifications.map((spec) => removeTemporaryProperties(spec));
            updateSpecificationsOnServer(preparedSpecifications, projectID);
        } catch (error) {
            enqueueSnackbar(`Error saving data ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
        }
    };

    const handleAddNewCard = async () => {
        if (newCard) {
            const tempId = specifications.length ? specifications[specifications.length - 1].id + 1 : 1;
            let newSpecification = { id: tempId, ...newCardContent };
            newSpecification = removeTemporaryProperties(newSpecification);

            const updatedSpecifications = [...specifications, newSpecification];
            updateSpecificationsState(updatedSpecifications);

            setNewCard(false);
            setNewCardContent(defaultCardContent);
        } else {
            setNewCard(true);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        try {
            const updatedSpecifications = specifications.filter((spec) => spec.id !== id);
            updateSpecificationsState(updatedSpecifications);
        } catch (error) {
            enqueueSnackbar(`Error deleting specification: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
        }
    };

    // When new item is genereted by server this funcion handles saving it to local view and server
    const handleSpecificationsResponseSave = (id, event) => {
        event.stopPropagation();
        const newSpecification = regeneratedSpecifications.find((spec) => spec.id === id);

        setRegeneratedSpecifications((prev) =>
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

    // Sends update request to server, it passes context in form of every specification that was selected
    const handleUpdateRequest = (textareaChatValue) => {
        const filteredSpecifications = filterSpecifications(specifications, selectedItems);
        const payload = {
            component_val: { specifications: filteredSpecifications },
            query: textareaChatValue,
            ai_model: "gpt-35-turbo",
        };

        sendAIRequest("ai-update", payload, (data) => {
            setRegeneratedSpecifications(
                data.specifications.map((spec, index) => ({
                    ...spec,
                    id: index,
                }))
            );
        });
    };

    // Sends regenerate request to server, it passes context in form of every specification that was selected
    const handleRegenerateRequest = (textareaInfoValue) => {
        const filteredSpecifications = filterSpecifications(specifications, selectedItems);
        const payload = {
            details: `${textareaInfoValue} and regenerate me for following elements: \n ${JSON.stringify(filteredSpecifications)}`,
            ai_model: "gpt-35-turbo",
        };

        sendAIRequest("ai-regenerate", payload, (data) => {
            setRegeneratedSpecifications(
                data.specifications.map((spec, index) => ({
                    ...spec,
                    id: index,
                }))
            );
        });
    };

    const sendAIRequest = async (endpoint, payload, callback) => {
        try {
            setIsRegenerating(true);
            const response = await axiosInstance.post(`${API_URLS.API_SERVER_URL}/model/specifications/${endpoint}`, payload);
            callback(response.data);
        } catch (error) {
            enqueueSnackbar(`Error sending request to ${endpoint}: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
            console.error(`Error sending request to ${endpoint}:`, error);
        } finally {
            setIsRegenerating(false);
        }
    };

    // ----------------UTILS---------------

    const updateSpecificationsOnServer = async (updatedSpecifications, projectID) => {
        try {
            const body = {
                project_id: projectID,
                new_val: {
                    specifications: updatedSpecifications,
                },
            };
            await axiosInstance.put(`${API_URLS.API_SERVER_URL}/model/specifications/update`, body);
        } catch (error) {
            console.error("Error updating specifications on server:", error);
            enqueueSnackbar(`Error updating specifications on server: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
            throw error;
        }
    };

    const addSpecificationToState = (newSpecification) => {
        const updatedSpecifications = [
            ...specifications,
            { ...newSpecification, id: specifications.length },
        ];
        setSpecifications(updatedSpecifications);
        updateSpecificationsOnServer(updatedSpecifications, projectID);
    };

    const updateSpecificationsState = (updatedSpecifications) => {
        setSpecifications(updatedSpecifications);
        updateSpecificationsOnServer(updatedSpecifications, projectID);
    };

    const removeTemporaryProperties = (specification) => { //TODO: modify backend too accept color, icon
        const { name, id, color, icon, isColorPickerOpen, isEditing, isFavorite, ...rest } = specification;
        return {
            ...rest,
            specification: name != undefined ? name : "",
        };
    };

    // ----------------OVERLOADED---------------

    const handleSave = async (id: number, e: React.MouseEvent) => {
        handleSaveGeneric(id, e, specifications, setSpecifications, handleSaveAllSpecifications);
    };

    const handleEdit = (id: number, e: React.MouseEvent) => {
        handleEditGeneric(id, e, setSpecifications)
    };

    const handleCancel = (id: number, e: React.MouseEvent) => {
        handleCancelGeneric(id, e, setSpecifications);
    };

    const toggleFavorite = (id: number, e: React.MouseEvent) => {
        console.log(specifications)
        toggleFavoriteGeneric(id, e, setSpecifications);
    };

    const toggleColorPicker = (id: number, e: React.MouseEvent) => {
        toggleColorPickerGeneric(id, e, setSpecifications);
    };

    const selectColor = (color: string, specificationId: number) => {
        selectColorGeneric(color, specificationId, setSpecifications);
    };

    const autoResize = (e: React.FormEvent<HTMLTextAreaElement>, id: number) => {
        autoResizeGeneric(e, id, textareaRefs);
    };

    const handleCtrlClickSelect = (specId: number, event: React.MouseEvent) => {
        console.log(specifications)
        const isEditing = specifications[specId]?.isEditing != undefined ? specifications[specId]?.isEditing : false
        handleCtrlClickSelectGeneric(specId, event, isEditing, setSelectedItems);
    };

    const handleSpecificationsResponseCancel = (id, event) => {
        handleSpecificationsResponseCancelGeneric(id, setSpecifications);
    };

    // This returns only those which are selected
    const filterSpecifications = (specifications, selectedItems) => {
        filterSpecificationsGeneric(specifications, selectedItems, removeTemporaryProperties);
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
                componentName={"specifications"}
            />

            <LoadingIndicatorWrapper isLoading={isRegenerating} />

            <SelectionWrapper
                setSelectedItems={setSelectedItems}
                specifications={specifications}
                containerRef={containerRef}
            >
                <GeneratedElementHeader
                    title="Project Specifications"
                    description="Manage and customize the specifications of your project"
                />
                <div ref={containerRef} className="flex flex-wrap justify-center items-start gap-4 p-4 relative">
                    {regeneratedSpecifications.length != 0 ?
                        (
                            regeneratedSpecifications.map((specification, index) => (
                                <div
                                    key={specification.id + 1000}
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
                                                    handleSpecificationsResponseSave(specification.id, e)
                                                }}
                                            />
                                            <IoCloseSharp
                                                className="w-5 h-5 text-red-500 cursor-pointer"
                                                title="Cancel"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSpecificationsResponseCancel(specification.id, e)
                                                }
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4" >
                                        <p className="mt-4 text-base text-gray-700 flex items-center gap-2">
                                            {specification.description}
                                        </p>
                                    </div>

                                </div>
                            ))
                        ) : (<></>)
                    }
                    {specifications.map((specification, index) => (
                        <div
                            key={specification.id}
                            onClick={(e) => !specification.isEditing ? handleCtrlClickSelect(specification.id, e) : setSelectedItems([])}

                            className={`max-w-lg w-full px-4 pt-4 border rounded-lg shadow-md ${(selectedItems.includes(specification.id) && !specification.isEditing) ? "bg-blue-100" : specification.color}  ${specification.isFavorite ? "shadow-xl border-2 border-green-500" : ""}  relative`}
                        >
                            <div className="flex justify-beetwen items-center mb-2" onClick={(e) => {
                                e.stopPropagation();
                            }}>
                                <span className="text-gray-800 text-sm absolute top-1 left-2 flex items-center justify-center">
                                    <p className="font-semibold w-5 h-5 flex justify-center items-center rounded-br-md mr-1">{index + 1}</p>
                                    <div className="flex items-center justify-center" style={{ paddingTop: "2px" }} onClick={(e) => {
                                        toggleFavorite(specification.id, e);
                                    }} >
                                        {isEditingMode && (
                                            specification.isFavorite ? (
                                                <FaHeart className="w-5 h-5 text-red-500 cursor-pointer" />
                                            ) : (
                                                <FaRegHeart className="w-5 h-5 text-gray-400 cursor-pointer" />
                                            )
                                        )}

                                    </div>
                                </span>
                                <div
                                    className="flex gap-2 w-full flex items-center justify-end"
                                    onClick={(e) => isEditingMode && specification.isEditing && e.stopPropagation()}
                                >
                                    {isEditingMode && specification.isEditing ? (
                                        <>

                                            <ColorPicker
                                                isOpen={specification.isColorPickerOpen}
                                                currentColor={specification.color}
                                                onToggle={(e) => toggleColorPicker(specification.id, e)}
                                                onSelectColor={(color) => selectColor(color, specification.id)}
                                            />

                                            <FaCheck
                                                className="w-5 h-5 text-green-500 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSave(specification.id, e);
                                                }}
                                            />
                                            <IoCloseSharp
                                                className="w-5 h-5 text-red-500 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCancel(specification.id, e);
                                                }}
                                            />
                                        </>
                                    ) : (
                                        isEditingMode && (
                                            <>
                                                <MdEdit
                                                    className="w-5 h-5 text-gray-400 cursor-pointer"
                                                    onClick={(e) => handleEdit(specification.id, e)}
                                                />
                                                <FaTrash
                                                    className="w-4 h-4 text-red-500 cursor-pointer"
                                                    onClick={(e) => handleDelete(specification.id, e)}
                                                />
                                            </>
                                        )
                                    )}
                                </div>
                            </div>
                            <div className="mb-4" onClick={(e) => {
                                e.stopPropagation();
                            }}>
                                {specification.isEditing ? (
                                    <>
                                        <textarea
                                            ref={(el) => (textareaRefs.current[specification.id] = el)}
                                            className="w-full mt-2 rounded-md p-2 bg-transparent resize-none shrink-0"
                                            value={specification.description}

                                            rows={4}
                                            onChange={(e) => {
                                                const { value } = e.target;
                                                setSpecifications((prevSpecifications) =>
                                                    prevSpecifications.map((spec) =>
                                                        spec.id === specification.id
                                                            ? { ...spec, description: value }
                                                            : spec
                                                    )
                                                );
                                            }}
                                            onClick={(e) => { e.stopPropagation(); }}
                                            onInput={(e) => autoResize(e, specification.id)}
                                            onBlur={() => handleSave(specification.id)}
                                        />
                                    </>
                                ) : (
                                    <p className="mt-4 text-base text-gray-700 flex items-center gap-2">
                                        {specification.description}
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
                                            description: "",
                                            color: "",
                                            icon: "",
                                            isColorPickerOpen: false,
                                            isFavorite: false
                                        });
                                    }} />
                            </div>
                            <textarea
                                ref={(el) => (textareaRefs.current[-1] = el)}
                                className="w-full mt-2 rounded-md p-2 bg-transparent resize-none shrink-0"
                                placeholder="New Specification Description"
                                value={newCardContent.description}
                                onInput={(e) => autoResize(e, -1)}
                                onBlur={(e) => setNewCardContent({ ...newCardContent, description: e.target.value })}
                                onChange={(e) => setNewCardContent({ ...newCardContent, description: e.target.value })}
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

export default SpecificationsList;