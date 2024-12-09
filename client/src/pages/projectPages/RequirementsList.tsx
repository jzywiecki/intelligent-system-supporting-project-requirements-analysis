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

interface Requirements {
    id: number;
    name: string;
    description: string;
    isEditing?: boolean;
    color: string;
    isFavorite?: boolean;
    isColorPickerOpen: boolean;
    isFunctional: boolean;
}

const RequirementsList: React.FC = () => {
    const { projectID } = useParams();
    const [requirements, setRequirements] = useState<Requirements[]>([]);
    const [regeneratedRequirements, setRegeneratedRequirements] = useState<Requirements[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
    const [isEditingMode, setIsEditingMode] = useState<boolean>(false);
    const [newCard, setNewCard] = useState(false);
    const [newCardContent, setNewCardContent] = useState({ name: "", description: "", isFunctional: false, priority: "Low", color: "", icon: "", isColorPickerOpen: false });
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
    const textareaNameRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
    const { enqueueSnackbar } = useSnackbar();

    const defaultCardContent = {
        name: "",
        priority: "Low",
        description: "",
        color: "",
        icon: "",
        isColorPickerOpen: false,
        isFavorite: false,
        isFunctional: false,
    };

    // Fetches data from server and appends it by fields for edition, favourites and colors
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get(`${API_URLS.API_SERVER_URL}/model/requirements/${projectID}`);
            console.log(response.data)

            const functional = response.data.functional_requirements.map((spec: Requirements, index) => ({
                ...spec,
                id: index,
                isEditing: false,
                color: 'bg-white',
                isFavorite: false,
                isColorPickerOpen: false,
                isFunctional: true,
            }));

            const nonfunctional = response.data.non_functional_requirements.map((spec: Requirements, index) => ({
                ...spec,
                id: functional.length + index,
                isEditing: false,
                color: 'bg-white',
                isFavorite: false,
                isColorPickerOpen: false,
                isFunctional: false,
            }));

            const allRequirements = [...functional, ...nonfunctional];

            setRequirements(allRequirements);
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
            const message = { component: getComponentyByName("requirements").id }
            socket.emit("finish-edition", message);
            setIsEditingMode(false);
        }
    }, [projectID]);

    // Removes fields not supported by server and sends put request to server
    const handleSaveAllRequirements = async () => {
        try {
            const preparedRequirements = requirements.map((spec) => removeTemporaryProperties(spec));
            const preparedRequirements2 = preparedRequirements.map((spec) => removeIsFuncionalProperties(spec));

            updateRequirementsOnServer(preparedRequirements2, projectID);
        } catch (error) {
            enqueueSnackbar(`Error saving data ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
        }
    };

    const handleAddNewCard = async () => {
        if (newCard) {
            const tempId = requirements.length ? requirements[requirements.length - 1].id + 1 : 1;
            let newSpecification = { id: tempId, ...newCardContent };

            const updatedRequirements = [...requirements, newSpecification];

            updateRequirementsState(updatedRequirements);

            setNewCard(false);
            setNewCardContent(defaultCardContent);
        } else {
            setNewCard(true);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        try {
            const updatedRequirements = requirements.filter((spec) => spec.id !== id);
            updateRequirementsState(updatedRequirements);
        } catch (error) {
            enqueueSnackbar(`Error deleting requirement: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
        }
    };

    // When new item is genereted by server this funcion handles saving it to local view and server
    const handleRequirementsResponseSave = (id, event) => {
        event.stopPropagation();
        const newSpecification = regeneratedRequirements.find((spec) => spec.id === id);

        setRegeneratedRequirements((prev) =>
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

    const getPriorityColor = (priority) => {
        switch (priority) {
            case "High": return "text-red-600";
            case "Medium": return "text-yellow-600";
            case "Low": return "text-green-600";
            default: return "text-gray-600";
        }
    };

    // Sends update request to server, it passes context in form of every requirement that was selected
    const handleUpdateRequest = (textareaChatValue) => {
        const filteredRequirements = filterRequirements(requirements, selectedItems);
        const payload = {
            component_val: { requirements: filteredRequirements },
            query: textareaChatValue,
            ai_model: "gpt-35-turbo",
        };

        sendAIRequest("ai-update", payload, (data) => {
            setRegeneratedRequirements(
                data.requirements.map((spec, index) => ({
                    ...spec,
                    id: index,
                }))
            );
        });
    };

    // Sends regenerate request to server, it passes context in form of every requirement that was selected
    const handleRegenerateRequest = (textareaInfoValue) => {
        const filteredRequirements = filterRequirements(requirements, selectedItems);
        const payload = {
            details: `${textareaInfoValue} and regenerate me for following elements: \n ${JSON.stringify(filteredRequirements)}`,
            ai_model: "gpt-35-turbo",
        };

        sendAIRequest("ai-regenerate", payload, (data) => {
            setRegeneratedRequirements(
                data.requirements.map((spec, index) => ({
                    ...spec,
                    id: index,
                }))
            );
        });
    };

    const sendAIRequest = async (endpoint, payload, callback) => {
        try {
            setIsRegenerating(true);
            const response = await axiosInstance.post(`${API_URLS.API_SERVER_URL}/model/requirements/${endpoint}`, payload);
            callback(response.data);
        } catch (error) {
            enqueueSnackbar(`Error sending request to ${endpoint}: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
            console.error(`Error sending request to ${endpoint}:`, error);
        } finally {
            setIsRegenerating(false);
        }
    };

    // ----------------UTILS---------------

    const updateRequirementsOnServer = async (updatedRequirements, projectID) => {
        try {
            const functionalRequirements = updatedRequirements.filter(req => req.isFunctional);
            const nonFunctionalRequirements = updatedRequirements.filter(req => !req.isFunctional);

            const body = {
                project_id: projectID,
                new_val: {
                    functional_requirements: functionalRequirements,
                    non_functional_requirements: nonFunctionalRequirements,
                },
            };
            console.log("body", body)
            await axiosInstance.put(`${API_URLS.API_SERVER_URL}/model/requirements/update`, body);
        } catch (error) {
            console.error("Error updating requirements on server:", error);
            enqueueSnackbar(`Error updating requirements on server: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
            throw error;
        }
    };

    const addSpecificationToState = (newSpecification) => {
        const updatedRequirements = [
            ...requirements,
            { ...newSpecification, id: requirements.length },
        ];
        setRequirements(updatedRequirements);
        updateRequirementsOnServer(updatedRequirements, projectID);
    };

    const updateRequirementsState = (updatedRequirements) => {
        setRequirements(updatedRequirements);
        updateRequirementsOnServer(updatedRequirements, projectID);
    };

    const removeTemporaryProperties = (requirement) => { //TODO: modify backend too accept color, icon
        const { name, id, priority, color, isFunctional, icon, isColorPickerOpen, isEditing, isFavorite, description, ...rest } = requirement;
        return {
            ...rest,
            name: name != undefined ? name : "",
            description: description,
            priority: priority != "" ? priority : "Low",
            isFunctional: isFunctional
        };
    };

    const removeIsFuncionalProperties = (requirement) => { //TODO: modify backend too accept color, icon
        const { name, priority, description, ...rest } = requirement;
        return {
            ...rest,
            name: name != undefined ? name : "",
            description: description,
            priority: priority != "" ? priority : "Low",
        };
    };

    // ----------------OVERLOADED---------------

    const handleSave = async (id: number, e: React.MouseEvent) => {
        handleSaveGeneric(id, e, requirements, setRequirements, handleSaveAllRequirements);
    };

    const handleEdit = (id: number, e: React.MouseEvent) => {
        handleEditGeneric(id, e, setRequirements)
    };

    const handleCancel = (id: number, e: React.MouseEvent) => {
        handleCancelGeneric(id, e, setRequirements);
    };

    const toggleFavorite = (id: number, e: React.MouseEvent) => {
        console.log(requirements)
        toggleFavoriteGeneric(id, e, setRequirements);
    };

    const toggleColorPicker = (id: number, e: React.MouseEvent) => {
        toggleColorPickerGeneric(id, e, setRequirements);
    };

    const selectColor = (color: string, requirementId: number) => {
        selectColorGeneric(color, requirementId, setRequirements);
    };

    const autoResize = (e: React.FormEvent<HTMLTextAreaElement>, id: number) => {
        autoResizeGeneric(e, id, textareaRefs);
    };

    const autoNameResize = (e: React.FormEvent<HTMLTextAreaElement>, id: number) => {
        autoResizeGeneric(e, id, textareaNameRefs);
    };

    const handleCtrlClickSelect = (specId: number, event: React.MouseEvent) => {
        console.log(requirements)
        const isEditing = requirements[specId]?.isEditing != undefined ? requirements[specId]?.isEditing : false
        handleCtrlClickSelectGeneric(specId, event, isEditing, setSelectedItems);
    };

    const handleRequirementsResponseCancel = (id, event) => {
        handleSpecificationsResponseCancelGeneric(id, setRequirements);
    };

    // This returns only those which are selected
    const filterRequirements = (requirements, selectedItems) => {
        filterSpecificationsGeneric(requirements, selectedItems, removeTemporaryProperties);
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
                componentName={"requirements"}
            />
            <LoadingIndicatorWrapper isLoading={isRegenerating} />

            <SelectionWrapper
                setSelectedItems={setSelectedItems}
                specifications={requirements}
                containerRef={containerRef}
            >
                <GeneratedElementHeader
                    title="Project Requirements"
                    description="Manage and customize the requirements of your project"
                />
                <div ref={containerRef} className="flex flex-wrap justify-center items-start gap-4 p-4 relative">
                    {regeneratedRequirements.length != 0 ?
                        (
                            regeneratedRequirements.map((requirement, index) => (
                                <div
                                    key={requirement.id + 1000}
                                    className={`tmp max-w-lg w-full px-4 pt-4  border rounded-lg  relative `}
                                >
                                    <div className="flex flex-row w-full justify-end mb-2" >
                                        <span className="text-green-600 text-sm absolute top-2 left-2 flex items-center justify-center">
                                            <p className="font-semibold w-5 h-5 flex justify-center items-center rounded-br-md mr-1">New</p>
                                        </span>

                                        <span className="text-gray-800 text-sm absolute top-1 left-2 flex items-center justify-center"
                                            style={{ width: "100%" }}>
                                            <p className="font-semibold h-5 flex flex-row justify-center items-center rounded-br-md "
                                                style={{ width: "100%" }}
                                            ><p>{requirement.name}</p></p>
                                        </span>
                                        <div className="flex absolute top-1 right-2 justify-end gap-2 mt-4">
                                            <FaCheck
                                                className="w-5 h-5 text-green-500 cursor-pointer"
                                                title="Save"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRequirementsResponseSave(requirement.id, e)
                                                }}
                                            />
                                            <IoCloseSharp
                                                className="w-5 h-5 text-red-500 cursor-pointer"
                                                title="Cancel"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRequirementsResponseCancel(requirement.id, e)
                                                }
                                                }
                                            />

                                        </div>
                                    </div>

                                    <div className="mb-4" >
                                        <p className="mt-4 text-base text-gray-700 flex items-center gap-2">
                                            {requirement.description}
                                        </p>
                                    </div>

                                </div>
                            ))
                        ) : (<></>)
                    }
                    {requirements.map((requirement, index) => (
                        <div
                            key={requirement.id}
                            onClick={(e) => !requirement.isEditing ? handleCtrlClickSelect(requirement.id, e) : setSelectedItems([])}

                            className={`max-w-lg w-full px-4 pt-4 border rounded-lg shadow-md ${(selectedItems.includes(requirement.id) && !requirement.isEditing) ? "bg-blue-100" : requirement.color}  ${requirement.isFavorite ? "shadow-xl border-2 border-green-500" : ""}  relative`}
                        >
                            <div className="flex justify-beetwen items-center mb-2" onClick={(e) => {
                                e.stopPropagation();
                            }}>
                                <span className="text-gray-800 text-sm absolute top-1 left-2 flex items-center justify-center"
                                    style={{ width: "100%" }}>
                                    <p className="font-semibold w-5 h-5 flex flex-row justify-center items-center rounded-br-md mr-1"
                                    >{index + 1}</p>
                                    <div className="flex items-center justify-center" style={{ paddingTop: "2px" }} onClick={(e) => {
                                        toggleFavorite(requirement.id, e);
                                    }} >
                                        {isEditingMode && (
                                            requirement.isFavorite ? (
                                                <FaHeart className="w-5 h-5 text-red-500 cursor-pointer" />
                                            ) : (
                                                <FaRegHeart className="w-5 h-5 text-gray-400 cursor-pointer" />
                                            )
                                        )}

                                    </div>
                                    {requirement.isEditing ? (
                                        <div className="font-semibold h-5 flex flex-row justify-center items-center rounded-br-md "
                                            style={{ width: "100%" }}>
                                            <textarea
                                                ref={(el) => (textareaNameRefs.current[requirement.id] = el)}
                                                className="mt-2 rounded-md p-2 bg-transparent resize-none shrink-0"
                                                style={{ width: "70%", textAlign: "center" }}
                                                value={requirement.name}

                                                rows={1}
                                                onChange={(e) => {
                                                    const { value } = e.target;
                                                    setRequirements((prevRequirements) =>
                                                        prevRequirements.map((spec) =>
                                                            spec.id === requirement.id
                                                                ? { ...spec, name: value }
                                                                : spec
                                                        )
                                                    );
                                                }}
                                                onClick={(e) => { e.stopPropagation(); }}
                                                onInput={(e) => autoNameResize(e, requirement.id)}
                                                onBlur={() => handleSave(requirement.id)}
                                            />
                                        </div>
                                    ) : (
                                        <p className="font-semibold h-5 flex flex-row justify-center items-center rounded-br-md "
                                            style={{ width: "100%" }}
                                        ><p>{requirement.name}</p></p>
                                    )}

                                </span>
                                <div
                                    className="flex gap-2 w-full flex items-center justify-end"
                                    onClick={(e) => isEditingMode && requirement.isEditing && e.stopPropagation()}
                                >
                                    {isEditingMode && requirement.isEditing ? (
                                        <>

                                            <ColorPicker
                                                isOpen={requirement.isColorPickerOpen}
                                                currentColor={requirement.color}
                                                onToggle={(e) => toggleColorPicker(requirement.id, e)}
                                                onSelectColor={(color) => selectColor(color, requirement.id)}
                                            />

                                            <FaCheck
                                                className="w-5 h-5 text-green-500 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSave(requirement.id, e);
                                                }}
                                            />
                                            <IoCloseSharp
                                                className="w-5 h-5 text-red-500 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCancel(requirement.id, e);
                                                }}
                                            />
                                        </>
                                    ) : (
                                        isEditingMode && (
                                            <>
                                                <MdEdit
                                                    className="w-5 h-5 text-gray-400 cursor-pointer"
                                                    onClick={(e) => handleEdit(requirement.id, e)}
                                                />
                                                <FaTrash
                                                    className="w-4 h-4 text-red-500 cursor-pointer"
                                                    onClick={(e) => handleDelete(requirement.id, e)}
                                                />
                                            </>
                                        )
                                    )}
                                </div>
                            </div>
                            <div className="mb-4" onClick={(e) => {
                                e.stopPropagation();
                            }}>
                                {requirement.isEditing ? (
                                    <>
                                        <textarea
                                            ref={(el) => (textareaRefs.current[requirement.id] = el)}
                                            className="w-full mt-2 rounded-md p-2 bg-transparent resize-none shrink-0"
                                            value={requirement.description}

                                            rows={4}
                                            onChange={(e) => {
                                                const { value } = e.target;
                                                setRequirements((prevRequirements) =>
                                                    prevRequirements.map((spec) =>
                                                        spec.id === requirement.id
                                                            ? { ...spec, description: value }
                                                            : spec
                                                    )
                                                );
                                            }}
                                            onClick={(e) => { e.stopPropagation(); }}
                                            onInput={(e) => autoResize(e, requirement.id)}
                                            onBlur={() => handleSave(requirement.id)}
                                        />
                                    </>
                                ) : (
                                    <p className="mt-4 text-base text-gray-700 flex items-center gap-2">
                                        {requirement.description}
                                    </p>
                                )}
                                <div className="mt-4 flex items-center justify-between">
                                    <label className="text-gray-600 text-sm">Priority:</label>
                                    {requirement.isEditing ? (
                                        <select
                                            className="p-2 border rounded-md"
                                            value={requirement.priority}
                                            onChange={(e) => {
                                                const { value } = e.target;
                                                setRequirements((prevRequirements) =>
                                                    prevRequirements.map((spec) =>
                                                        spec.id === requirement.id
                                                            ? { ...spec, priority: value }
                                                            : spec
                                                    )
                                                );
                                            }}
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                        </select>
                                    ) : (
                                        <span className={`font-semibold ${getPriorityColor(requirement.priority)}`}>
                                            {requirement.priority}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2 flex items-center justify-between">
                                    <label className="text-gray-600 text-sm">Functional:</label>
                                    <input
                                        type="checkbox"
                                        checked={requirement.isFunctional}
                                        onChange={(e) => {
                                            const { checked } = e.target;
                                            setRequirements((prevRequirements) =>
                                                prevRequirements.map((spec) =>
                                                    spec.id === requirement.id
                                                        ? { ...spec, isFunctional: checked }
                                                        : spec
                                                )
                                            );
                                        }}
                                        className="cursor-pointer"
                                        disabled={!requirement.isEditing}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    {newCard ? (
                        <div className={`max-w-lg w-full p-4 border rounded-lg border-dashed border-gray-300 shadow-md relative ${newCardContent.color}`}>

                            <span className="text-gray-800 text-sm absolute top-1 left-2 flex items-center justify-center"
                                style={{ width: "100%" }}>
                                <div className="font-semibold h-5 flex flex-row justify-center items-center rounded-br-md "
                                    style={{ width: "100%" }}>

                                    <textarea
                                        ref={(el) => (textareaNameRefs.current[-1] = el)}
                                        className="mt-2 rounded-md p-2 bg-transparent resize-none shrink-0"
                                        style={{ width: "70%", textAlign: "center" }}

                                        rows={1}
                                        placeholder="Name of requirement"

                                        value={newCardContent.name}
                                        onInput={(e) => autoResize(e, -1)}
                                        onBlur={(e) => setNewCardContent({ ...newCardContent, name: e.target.value })}
                                        onChange={(e) => setNewCardContent({ ...newCardContent, name: e.target.value })}
                                    />
                                </div>
                            </span>
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
                                            description: "",
                                            color: "",
                                            icon: "",
                                            isColorPickerOpen: false,
                                            isFavorite: false,
                                            priority: "Low",
                                            isFunctional: false
                                        });
                                    }} />
                            </div>
                            <textarea
                                ref={(el) => (textareaRefs.current[-1] = el)}
                                className="w-full mt-2 rounded-md p-2 bg-transparent resize-none shrink-0"
                                placeholder="New requirement Description"
                                value={newCardContent.description}
                                onInput={(e) => autoResize(e, -1)}
                                onBlur={(e) => setNewCardContent({ ...newCardContent, description: e.target.value })}
                                onChange={(e) => setNewCardContent({ ...newCardContent, description: e.target.value })}
                            />

                            <div className="mt-4 flex items-center justify-between">
                                <label className="text-gray-600 text-sm">Priority:</label>
                                <select
                                    className="p-2 border rounded-md"
                                    value={newCardContent.priority}
                                    onChange={(e) => setNewCardContent({ ...newCardContent, priority: e.target.value })}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>

                            <div className="mt-2 flex items-center justify-between">
                                <label className="text-gray-600 text-sm">Functional:</label>
                                <input
                                    type="checkbox"
                                    checked={newCardContent.isFunctional}
                                    onChange={(e) =>
                                        setNewCardContent({ ...newCardContent, isFunctional: e.target.checked })
                                    }
                                    className="cursor-pointer"
                                />
                            </div>

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



export default RequirementsList;