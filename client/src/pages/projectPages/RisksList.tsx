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

interface Risks {
    id: number;
    risk: string;
    description: string;
    prevention: string;
    isEditing?: boolean;
    color: string;
    isFavorite?: boolean;
    isColorPickerOpen: boolean;
}

const RiskList: React.FC = () => {
    const { projectID } = useParams();
    const [risks, setRisks] = useState<Risks[]>([]);
    const [regeneratedRisks, setRegeneratedRisks] = useState<Risks[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
    const [isEditingMode, setIsEditingMode] = useState<boolean>(false);
    const [newCard, setNewCard] = useState(false);
    const [newCardContent, setNewCardContent] = useState({ risk: "", description: "", prevention: "", color: "", icon: "", isColorPickerOpen: false });
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
    const textareaNameRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
    const textareaAdditionalRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
    const { enqueueSnackbar } = useSnackbar();

    const defaultCardContent = {
        risk: "",
        prevention: "",
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
            const response = await axiosInstance.get(`${API_URLS.API_SERVER_URL}/model/risks/${projectID}`);
            console.log(response.data)
            setRisks(
                response.data.risks.map((spec: Risks, index) => ({
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
            const message = { component: getComponentyByName("risks").id }
            socket.emit("finish-edition", message);
            setIsEditingMode(false);
        }
    }, [projectID]);

    // Removes fields not supported by server and sends put request to server
    const handleSaveAllRisks = async () => {
        try {
            const preparedRisks = risks.map((spec) => removeTemporaryProperties(spec));
            updateRisksOnServer(preparedRisks, projectID);
        } catch (error) {
            enqueueSnackbar(`Error saving data ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
        }
    };

    const handleAddNewCard = async () => {
        if (newCard) {
            const tempId = risks.length ? risks[risks.length - 1].id + 1 : 1;
            let newSpecification = { id: tempId, ...newCardContent };
            newSpecification = removeTemporaryProperties(newSpecification);

            const updatedRisks = [...risks, newSpecification];
            updateRisksState(updatedRisks);

            setNewCard(false);
            setNewCardContent(defaultCardContent);
        } else {
            setNewCard(true);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        try {
            const updatedRisks = risks.filter((spec) => spec.id !== id);
            updateRisksState(updatedRisks);
        } catch (error) {
            enqueueSnackbar(`Error deleting risk: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
        }
    };

    // When new item is genereted by server this funcion handles saving it to local view and server
    const handleRisksResponseSave = (id, event) => {
        event.stopPropagation();
        const newSpecification = regeneratedRisks.find((spec) => spec.id === id);

        setRegeneratedRisks((prev) =>
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

    // Sends update request to server, it passes context in form of every risk that was selected
    const handleUpdateRequest = (textareaChatValue) => {
        const filteredRisks = filterRisks(risks, selectedItems);
        const payload = {
            component_val: { risks: filteredRisks },
            query: textareaChatValue,
            ai_model: "gpt-35-turbo",
        };

        sendAIRequest("ai-update", payload, (data) => {
            setRegeneratedRisks(
                data.risks.map((spec, index) => ({
                    ...spec,
                    id: index,
                }))
            );
        });
    };

    // Sends regenerate request to server, it passes context in form of every risk that was selected
    const handleRegenerateRequest = (textareaInfoValue) => {
        const filteredRisks = filterRisks(risks, selectedItems);
        const payload = {
            details: `${textareaInfoValue} and regenerate me for following elements: \n ${JSON.stringify(filteredRisks)}`,
            ai_model: "gpt-35-turbo",
        };

        sendAIRequest("ai-regenerate", payload, (data) => {
            setRegeneratedRisks(
                data.risks.map((spec, index) => ({
                    ...spec,
                    id: index,
                }))
            );
        });
    };

    const sendAIRequest = async (endpoint, payload, callback) => {
        try {
            setIsRegenerating(true);
            const response = await axiosInstance.post(`${API_URLS.API_SERVER_URL}/model/risks/${endpoint}`, payload);
            callback(response.data);
        } catch (error) {
            enqueueSnackbar(`Error sending request to ${endpoint}: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
            console.error(`Error sending request to ${endpoint}:`, error);
        } finally {
            setIsRegenerating(false);
        }
    };

    // ----------------UTILS---------------

    const updateRisksOnServer = async (updatedRisks, projectID) => {
        try {
            const body = {
                project_id: projectID,
                new_val: {
                    risks: updatedRisks,
                },
            };
            console.log("body", body)
            await axiosInstance.put(`${API_URLS.API_SERVER_URL}/model/risks/update`, body);
        } catch (error) {
            console.error("Error updating risks on server:", error);
            enqueueSnackbar(`Error updating risks on server: ${error.response?.status ?? 'Unknown error'}`, { variant: 'error' });
            throw error;
        }
    };

    const addSpecificationToState = (newSpecification) => {
        const updatedRisks = [
            ...risks,
            { ...newSpecification, id: risks.length },
        ];
        setRisks(updatedRisks);
        updateRisksOnServer(updatedRisks, projectID);
    };

    const updateRisksState = (updatedRisks) => {
        setRisks(updatedRisks);
        updateRisksOnServer(updatedRisks, projectID);
    };

    const removeTemporaryProperties = (riskProp) => { //TODO: modify backend too accept color, icon
        const { risk, id, color, icon, isColorPickerOpen, isEditing, isFavorite, description, prevention, ...rest } = riskProp;
        return {
            ...rest,
            risk: risk != undefined ? risk : "",
            description: description,
            prevention: prevention
        };
    };

    // ----------------OVERLOADED---------------

    const handleSave = async (id: number, e: React.MouseEvent) => {
        handleSaveGeneric(id, e, risks, setRisks, handleSaveAllRisks);
    };

    const handleEdit = (id: number, e: React.MouseEvent) => {
        handleEditGeneric(id, e, setRisks)
    };

    const handleCancel = (id: number, e: React.MouseEvent) => {
        handleCancelGeneric(id, e, setRisks);
    };

    const toggleFavorite = (id: number, e: React.MouseEvent) => {
        console.log(risks)
        toggleFavoriteGeneric(id, e, setRisks);
    };

    const toggleColorPicker = (id: number, e: React.MouseEvent) => {
        toggleColorPickerGeneric(id, e, setRisks);
    };

    const selectColor = (color: string, riskId: number) => {
        selectColorGeneric(color, riskId, setRisks);
    };

    const autoResize = (e: React.FormEvent<HTMLTextAreaElement>, id: number) => {
        autoResizeGeneric(e, id, textareaRefs);
    };

    const autoNameResize = (e: React.FormEvent<HTMLTextAreaElement>, id: number) => {
        autoResizeGeneric(e, id, textareaNameRefs);
    };

    const handleCtrlClickSelect = (specId: number, event: React.MouseEvent) => {
        console.log(risks)
        const isEditing = risks[specId]?.isEditing != undefined ? risks[specId]?.isEditing : false
        handleCtrlClickSelectGeneric(specId, event, isEditing, setSelectedItems);
    };

    const handleRisksResponseCancel = (id, event) => {
        handleSpecificationsResponseCancelGeneric(id, setRisks);
    };

    // This returns only those which are selected
    const filterRisks = (risks, selectedItems) => {
        filterSpecificationsGeneric(risks, selectedItems, removeTemporaryProperties);
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
                componentName={"risks"}
            />
            <LoadingIndicatorWrapper isLoading={isRegenerating} />

            <SelectionWrapper
                setSelectedItems={setSelectedItems}
                specifications={risks}
                containerRef={containerRef}
            >
                <GeneratedElementHeader
                    title="Project Risks"
                    description="Manage and customize the risks of your project"
                />
                <div ref={containerRef} className="flex flex-wrap justify-center items-start gap-4 p-4 relative">
                    {regeneratedRisks.length != 0 ?
                        (
                            regeneratedRisks.map((risk, index) => (
                                <div
                                    key={risk.id + 1000}
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
                                            ><p>{risk.risk}</p></p>
                                        </span>
                                        <div className="flex absolute top-1 right-2 justify-end gap-2 mt-4">
                                            <FaCheck
                                                className="w-5 h-5 text-green-500 cursor-pointer"
                                                title="Save"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRisksResponseSave(risk.id, e)
                                                }}
                                            />
                                            <IoCloseSharp
                                                className="w-5 h-5 text-red-500 cursor-pointer"
                                                title="Cancel"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRisksResponseCancel(risk.id, e)
                                                }
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4" >
                                        <p className="mt-4 text-base text-gray-700 flex items-center gap-2">
                                            {risk.description}
                                        </p>
                                    </div>

                                </div>
                            ))
                        ) : (<></>)
                    }
                    {risks.map((risk, index) => (
                        <div
                            key={risk.id}
                            onClick={(e) => !risk.isEditing ? handleCtrlClickSelect(risk.id, e) : setSelectedItems([])}

                            className={`max-w-lg w-full px-4 pt-4 border rounded-lg shadow-md ${(selectedItems.includes(risk.id) && !risk.isEditing) ? "bg-blue-100" : risk.color}  ${risk.isFavorite ? "shadow-xl border-2 border-green-500" : ""}  relative`}
                        >
                            <div className="flex justify-beetwen items-center mb-2" onClick={(e) => {
                                e.stopPropagation();
                            }}>
                                <span className="text-gray-800 text-sm absolute top-1 left-2 flex items-center justify-center"
                                    style={{ width: "100%" }}>
                                    <p className="font-semibold w-5 h-5 flex flex-row justify-center items-center rounded-br-md mr-1"
                                    >{index + 1}</p>
                                    <div className="flex items-center justify-center" style={{ paddingTop: "2px" }} onClick={(e) => {
                                        toggleFavorite(risk.id, e);
                                    }} >
                                        {isEditingMode && (
                                            risk.isFavorite ? (
                                                <FaHeart className="w-5 h-5 text-red-500 cursor-pointer" />
                                            ) : (
                                                <FaRegHeart className="w-5 h-5 text-gray-400 cursor-pointer" />
                                            )
                                        )}

                                    </div>
                                    {risk.isEditing ? (
                                        <div className="font-semibold h-5 flex flex-row justify-center items-center rounded-br-md "
                                            style={{ width: "100%" }}>
                                            <textarea
                                                ref={(el) => (textareaNameRefs.current[risk.id] = el)}
                                                className="mt-2 rounded-md p-2 bg-transparent resize-none shrink-0"
                                                style={{ width: "70%", textAlign: "center" }}
                                                value={risk.risk}

                                                rows={1}
                                                onChange={(e) => {
                                                    const { value } = e.target;
                                                    setRisks((prevRisks) =>
                                                        prevRisks.map((spec) =>
                                                            spec.id === risk.id
                                                                ? { ...spec, risk: value }
                                                                : spec
                                                        )
                                                    );
                                                }}
                                                onClick={(e) => { e.stopPropagation(); }}
                                                onInput={(e) => autoNameResize(e, risk.id)}
                                                onBlur={() => handleSave(risk.id)}
                                            />
                                        </div>
                                    ) : (
                                        <p className="font-semibold h-5 flex flex-row justify-center items-center rounded-br-md "
                                            style={{ width: "100%" }}
                                        ><p>{risk.risk}</p></p>
                                    )}

                                </span>
                                <div
                                    className="flex gap-2 w-full flex items-center justify-end"
                                    onClick={(e) => isEditingMode && risk.isEditing && e.stopPropagation()}
                                >
                                    {isEditingMode && risk.isEditing ? (
                                        <>

                                            <ColorPicker
                                                isOpen={risk.isColorPickerOpen}
                                                currentColor={risk.color}
                                                onToggle={(e) => toggleColorPicker(risk.id, e)}
                                                onSelectColor={(color) => selectColor(color, risk.id)}
                                            />

                                            <FaCheck
                                                className="w-5 h-5 text-green-500 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSave(risk.id, e);
                                                }}
                                            />
                                            <IoCloseSharp
                                                className="w-5 h-5 text-red-500 cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCancel(risk.id, e);
                                                }}
                                            />
                                        </>
                                    ) : (
                                        isEditingMode && (
                                            <>
                                                <MdEdit
                                                    className="w-5 h-5 text-gray-400 cursor-pointer"
                                                    onClick={(e) => handleEdit(risk.id, e)}
                                                />
                                                <FaTrash
                                                    className="w-4 h-4 text-red-500 cursor-pointer"
                                                    onClick={(e) => handleDelete(risk.id, e)}
                                                />
                                            </>
                                        )
                                    )}
                                </div>
                            </div>
                            <div className="mb-4" onClick={(e) => {
                                e.stopPropagation();
                            }}>
                                {risk.isEditing ? (
                                    <>
                                        <textarea
                                            ref={(el) => (textareaRefs.current[risk.id] = el)}
                                            className="w-full mt-2 rounded-md p-2 bg-transparent resize-none shrink-0"
                                            value={risk.description}

                                            rows={4}
                                            onChange={(e) => {
                                                const { value } = e.target;
                                                setRisks((prevRisks) =>
                                                    prevRisks.map((spec) =>
                                                        spec.id === risk.id
                                                            ? { ...spec, description: value }
                                                            : spec
                                                    )
                                                );
                                            }}
                                            onClick={(e) => { e.stopPropagation(); }}
                                            onInput={(e) => autoResize(e, risk.id)}
                                            onBlur={() => handleSave(risk.id)}
                                        />
                                    </>
                                ) : (
                                    <p className="mt-4 text-base text-gray-700 flex items-center gap-2">
                                        {risk.description}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center mt-7">
                                <div className="flex-grow h-px bg-gray-300"></div>
                                <span className="px-4 text-gray-600 font-medium">Prevention</span>
                                <div className="flex-grow h-px bg-gray-300"></div>
                            </div>
                            <div className="mb-4" onClick={(e) => {
                                e.stopPropagation();
                            }}>
                                {risk.isEditing ? (
                                    <>
                                        <textarea
                                            ref={(el) => (textareaAdditionalRefs.current[risk.id] = el)}
                                            className="w-full mt-2 rounded-md p-2 bg-transparent resize-none shrink-0"
                                            value={risk.prevention}

                                            rows={4}
                                            onChange={(e) => {
                                                const { value } = e.target;
                                                setRisks((prevRisks) =>
                                                    prevRisks.map((spec) =>
                                                        spec.id === risk.id
                                                            ? { ...spec, prevention: value }
                                                            : spec
                                                    )
                                                );
                                            }}
                                            onClick={(e) => { e.stopPropagation(); }}
                                            onInput={(e) => autoResize(e, risk.id)}
                                            onBlur={() => handleSave(risk.id)}
                                        />
                                    </>
                                ) : (
                                    <p className="mt-4 text-base text-gray-700 flex items-center gap-2">
                                        {risk.prevention}
                                    </p>
                                )}
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
                                        placeholder="Name of risk"

                                        value={newCardContent.risk}
                                        onInput={(e) => autoResize(e, -1)}
                                        onBlur={(e) => setNewCardContent({ ...newCardContent, risk: e.target.value })}
                                        onChange={(e) => setNewCardContent({ ...newCardContent, risk: e.target.value })}
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


export default RiskList;
