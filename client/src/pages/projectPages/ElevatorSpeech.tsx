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

interface ElevatorSpeeches {
    id: number;
    elevator_speech: string;
    isEditing?: boolean;
    color: string;
    isFavorite?: boolean;
    isColorPickerOpen: boolean;
}

const ElevatorSpeechList: React.FC = () => {
    const { projectID } = useParams();
    const [elevator_speeches, setElevatorSpeeches] = useState<ElevatorSpeeches[]>([]);
    const [regeneratedElevatorSpeeches, setRegeneratedElevatorSpeeches] = useState<ElevatorSpeeches[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
    const [isEditingMode, setIsEditingMode] = useState<boolean>(false);
    const [newCard, setNewCard] = useState(false);
    const [newCardContent, setNewCardContent] = useState({ elevator_speech: "", color: "", isColorPickerOpen: false, isEditing: false });
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
    const { enqueueSnackbar } = useSnackbar();

    const defaultCardContent = {
        elevator_speech: "",
        color: "",
        isColorPickerOpen: false,
        isFavorite: false,
        isEditing: false

    };

    // Fetches data from server and appends it by fields for edition, favourites and colors
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`${API_URLS.API_SERVER_URL}/model/elevator_speech/${projectID}`);
            console.log(response.data)
            setElevatorSpeeches(
                response.data.elevator_speeches.map((spec: ElevatorSpeeches, index) => ({
                    id: index,
                    isEditing: false,
                    color: 'bg-white',
                    isFavorite: false,
                    isColorPickerOpen: false,
                    elevator_speech: spec
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
            const message = { component: getComponentyByName("elevator_speeches").id }
            socket.emit("finish-edition", message);
            setIsEditingMode(false);
        }
    }, [projectID]);

    // Removes fields not supported by server and sends put request to server
    const handleSaveAllElevatorSpeeches = async () => {
        try {
            const preparedElevatorSpeeches = elevator_speeches.map((spec) => removeTemporaryProperties(spec));
            updateElevatorSpeechesOnServer(preparedElevatorSpeeches, projectID);
        } catch (error) {
            enqueueSnackbar(`Error saving data ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
        }
    };

    const handleAddNewCard = async () => {
        if (newCard) {
            const tempId = elevator_speeches.length ? elevator_speeches[elevator_speeches.length - 1].id + 1 : 1;
            let newSpecification = { id: tempId, ...newCardContent };
            // newSpecification = removeTemporaryProperties(newSpecification);

            const updatedElevatorSpeeches = [...elevator_speeches, newSpecification];
            updateElevatorSpeechesState(updatedElevatorSpeeches);

            setNewCard(false);
            setNewCardContent(defaultCardContent);
        } else {
            setNewCard(true);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        try {
            const updatedElevatorSpeeches = elevator_speeches.filter((spec) => spec.id !== id);
            updateElevatorSpeechesState(updatedElevatorSpeeches);
        } catch (error) {
            enqueueSnackbar(`Error deleting specification: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
        }
    };

    // When new item is genereted by server this funcion handles saving it to local view and server
    const handleElevatorSpeechesResponseSave = (id, event) => {
        event.stopPropagation();
        const newSpecification = regeneratedElevatorSpeeches.find((spec) => spec.id === id);

        setRegeneratedElevatorSpeeches((prev) =>
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

    // Sends update request to server, it passes context in form of every elevator_speech that was selected
    const handleUpdateRequest = (textareaChatValue) => {
        const filteredElevatorSpeeches = filterElevatorSpeeches(elevator_speeches, selectedItems);
        const payload = {
            component_val: { elevator_speeches: filteredElevatorSpeeches },
            query: textareaChatValue,
            ai_model: "gpt-35-turbo",
        };

        sendAIRequest("ai-update", payload, (data) => {
            setRegeneratedElevatorSpeeches(
                data.elevator_speeches.map((spec, index) => ({
                    ...spec,
                    id: index,
                }))
            );
        });
    };

    // Sends regenerate request to server, it passes context in form of every elevator_speech that was selected
    const handleRegenerateRequest = (textareaInfoValue) => {
        const filteredElevatorSpeeches = filterElevatorSpeeches(elevator_speeches, selectedItems);
        const payload = {
            details: `${textareaInfoValue} and regenerate me for following elements: \n ${JSON.stringify(filteredElevatorSpeeches)}`,
            ai_model: "gpt-35-turbo",
        };

        sendAIRequest("ai-regenerate", payload, (data) => {
            setRegeneratedElevatorSpeeches(
                data.elevator_speeches.map((spec, index) => ({
                    ...spec,
                    id: index,
                }))
            );
        });
    };

    const sendAIRequest = async (endpoint, payload, callback) => {
        try {
            setIsRegenerating(true);
            const response = await axiosInstance.post(`${API_URLS.API_SERVER_URL}/model/elevator_speech/${endpoint}`, payload);
            callback(response.data);
        } catch (error) {
            enqueueSnackbar(`Error sending request to ${endpoint}: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
            console.error(`Error sending request to ${endpoint}:`, error);
        } finally {
            setIsRegenerating(false);
        }
    };

    // ----------------UTILS---------------

    const updateElevatorSpeechesOnServer = async (updatedElevatorSpeeches, projectID) => {

        try {
            const preparedElevatorSpeeches = updatedElevatorSpeeches.map((spec) => removeTemporaryProperties(spec));
            const body = {
                project_id: projectID,
                new_val: {
                    elevator_speeches: preparedElevatorSpeeches,
                },
            };
            await axiosInstance.put(`${API_URLS.API_SERVER_URL}/model/elevator_speech/update`, body);
        } catch (error) {
            console.error("Error updating elevator_speeches on server:", error);
            enqueueSnackbar(`Error updating elevator_speeches on server: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
            throw error;
        }
    };

    const addSpecificationToState = (newSpecification) => {
        const updatedElevatorSpeeches = [
            ...elevator_speeches,
            { ...newSpecification, id: elevator_speeches.length },
        ];
        setElevatorSpeeches(updatedElevatorSpeeches);
        updateElevatorSpeechesOnServer(updatedElevatorSpeeches, projectID);
    };

    const updateElevatorSpeechesState = (updatedElevatorSpeeches) => {
        setElevatorSpeeches(updatedElevatorSpeeches);
        updateElevatorSpeechesOnServer(updatedElevatorSpeeches, projectID);
    };

    const removeTemporaryProperties = (elevator_speechProp) => { //TODO: modify backend too accept color, icon
        const { elevator_speech, id, color, isColorPickerOpen, isEditing, isFavorite } = elevator_speechProp;
        return elevator_speech != undefined ? elevator_speech : ""
    };

    // ----------------OVERLOADED---------------

    const handleSave = async (id: number, e: React.MouseEvent) => {
        handleSaveGeneric(id, e, elevator_speeches, setElevatorSpeeches, handleSaveAllElevatorSpeeches);
    };

    const handleEdit = (id: number, e: React.MouseEvent) => {
        handleEditGeneric(id, e, setElevatorSpeeches)
    };

    const handleCancel = (id: number, e: React.MouseEvent) => {
        handleCancelGeneric(id, e, setElevatorSpeeches);
    };

    const toggleFavorite = (id: number, e: React.MouseEvent) => {
        toggleFavoriteGeneric(id, e, setElevatorSpeeches);
    };

    const toggleColorPicker = (id: number, e: React.MouseEvent) => {
        toggleColorPickerGeneric(id, e, setElevatorSpeeches);
    };

    const selectColor = (color: string, elevator_speechId: number) => {
        selectColorGeneric(color, elevator_speechId, setElevatorSpeeches);
    };

    const autoResize = (e: React.FormEvent<HTMLTextAreaElement>, id: number) => {
        autoResizeGeneric(e, id, textareaRefs);
    };

    const handleCtrlClickSelect = (specId: number, event: React.MouseEvent) => {
        const isEditing = elevator_speeches[specId]?.isEditing != undefined ? elevator_speeches[specId]?.isEditing : false
        handleCtrlClickSelectGeneric(specId, event, isEditing, setSelectedItems);
    };

    const handleElevatorSpeechesResponseCancel = (id, event) => {
        handleSpecificationsResponseCancelGeneric(id, setElevatorSpeeches);
    };

    // This returns only those which are selected
    const filterElevatorSpeeches = (elevator_speeches, selectedItems) => {
        filterSpecificationsGeneric(elevator_speeches, selectedItems, removeTemporaryProperties);
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
                componentName={"elevator_speeches"}
            />
            <LoadingIndicatorWrapper isLoading={isRegenerating} />

            <SelectionWrapper
                setSelectedItems={setSelectedItems}
                specifications={elevator_speeches}
                containerRef={containerRef}
            >
                <GeneratedElementHeader
                    title="Elevator speech list for projects"
                    description="Manage and customize elevator speech for your project"
                />
                <div ref={containerRef} className="flex flex-wrap justify-center items-start gap-4 p-4 relative">
                    {regeneratedElevatorSpeeches.length != 0 ?
                        (
                            regeneratedElevatorSpeeches.map((elevator_speech, index) => (
                                <div
                                    key={elevator_speech.id + 1000}
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
                                                    handleElevatorSpeechesResponseSave(elevator_speech.id, e)
                                                }}
                                            />
                                            <IoCloseSharp
                                                className="w-5 h-5 text-red-500 cursor-pointer"
                                                title="Cancel"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleElevatorSpeechesResponseCancel(elevator_speech.id, e)
                                                }
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4" >
                                        <p className="mt-4 text-base text-gray-700 flex items-center gap-2">
                                            {elevator_speech.elevator_speech}
                                        </p>
                                    </div>

                                </div>
                            ))
                        ) : (<></>)
                    }
                    {elevator_speeches.map((elevator_speech, index) => (
                        <div
                            key={elevator_speech.id}
                            onClick={(e) => !elevator_speech.isEditing ? handleCtrlClickSelect(elevator_speech.id, e) : setSelectedItems([])}

                            className={`max-w-lg w-full px-4 pt-4 border rounded-lg shadow-md ${(selectedItems.includes(elevator_speech.id) && !elevator_speech.isEditing) ? "bg-blue-100" : elevator_speech.color}  ${elevator_speech.isFavorite ? "shadow-xl border-2 border-green-500" : ""}  relative`}
                        >
                            <div className="flex justify-beetwen items-center mb-2" onClick={(e) => {
                                e.stopPropagation();
                            }}>
                                <span className="text-gray-800 text-sm absolute top-1 left-2 flex items-center justify-center">
                                    <p className="font-semibold w-5 h-5 flex justify-center items-center rounded-br-md mr-1">{index + 1}</p>
                                    <div className="flex items-center justify-center" style={{ paddingTop: "2px" }} onClick={(e) => {
                                        toggleFavorite(elevator_speech.id, e);
                                    }} >
                                        {isEditingMode && (
                                            elevator_speech.isFavorite ? (
                                                <FaHeart className="w-5 h-5 text-red-500 cursor-pointer" />
                                            ) : (
                                                <FaRegHeart className="w-5 h-5 text-gray-400 cursor-pointer" />
                                            )
                                        )}

                                    </div>
                                </span>
                                <div
                                    className="flex gap-2 w-full flex items-center justify-end"
                                    onClick={(e) => isEditingMode && elevator_speech.isEditing && e.stopPropagation()}
                                >
                                    {isEditingMode && elevator_speech.isEditing ? (
                                        <>

                                            <ColorPicker
                                                isOpen={elevator_speech.isColorPickerOpen}
                                                currentColor={elevator_speech.color}
                                                onToggle={(e) => toggleColorPicker(elevator_speech.id, e)}
                                                onSelectColor={(color) => selectColor(color, elevator_speech.id)}
                                            />

                                            <FaCheck
                                                className="w-5 h-5 text-green-500 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSave(elevator_speech.id, e);
                                                }}
                                            />
                                            <IoCloseSharp
                                                className="w-5 h-5 text-red-500 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCancel(elevator_speech.id, e);
                                                }}
                                            />
                                        </>
                                    ) : (
                                        isEditingMode && (
                                            <>
                                                <MdEdit
                                                    className="w-5 h-5 text-gray-400 cursor-pointer"
                                                    onClick={(e) => handleEdit(elevator_speech.id, e)}
                                                />
                                                <FaTrash
                                                    className="w-4 h-4 text-red-500 cursor-pointer"
                                                    onClick={(e) => handleDelete(elevator_speech.id, e)}
                                                />
                                            </>
                                        )
                                    )}
                                </div>
                            </div>
                            <div className="mb-4" onClick={(e) => {
                                e.stopPropagation();
                            }}>
                                {elevator_speech.isEditing ? (
                                    <>
                                        <textarea
                                            ref={(el) => (textareaRefs.current[elevator_speech.id] = el)}
                                            className="w-full mt-2 rounded-md p-2 bg-transparent resize-none shrink-0"
                                            value={elevator_speech.elevator_speech}

                                            rows={4}
                                            onChange={(e) => {
                                                const { value } = e.target;
                                                setElevatorSpeeches((prevElevatorSpeeches) =>
                                                    prevElevatorSpeeches.map((spec) =>
                                                        spec.id === elevator_speech.id
                                                            ? { ...spec, elevator_speech: value }
                                                            : spec
                                                    )
                                                );
                                            }}
                                            onClick={(e) => { e.stopPropagation(); }}
                                            onInput={(e) => autoResize(e, elevator_speech.id)}
                                            onBlur={(e) => handleSave(elevator_speech.id, e)}
                                        />
                                    </>
                                ) : (
                                    <p className="mt-4 text-base text-gray-700 flex items-center gap-2">
                                        {elevator_speech.elevator_speech}
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
                                            elevator_speech: "",
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
                                value={newCardContent.elevator_speech}
                                onInput={(e) => autoResize(e, -1)}
                                onBlur={(e) => setNewCardContent({ ...newCardContent, elevator_speech: e.target.value })}
                                onChange={(e) => setNewCardContent({ ...newCardContent, elevator_speech: e.target.value })}
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


export default ElevatorSpeechList;

