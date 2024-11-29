import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useParams } from "react-router-dom";
import { API_URLS } from "@/services/apiUrls";
import axiosInstance from "@/services/api";
import InviteModal from '@/components/InviteModal';
import Search from '@/components/Search';
import { useUser } from '@/components/UserProvider';
import { User } from '@/pages/SearchAndAddFriends';
import { useSnackbar } from 'notistack';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from 'react-router-dom';

interface ProjectSettings {
    name: string;
    description: string;
    readme: string;
    owner: Members | null;
    members: Members[];
    managers: Members[];
    additional_info: string;
    for_who: string;
    doing_what: string;
}

interface Members {
    username: string;
    id: string;
    name: string;
    email: string;
}

const ProjectSettings: React.FC = () => {
    const navigate = useNavigate(); 
    const { user } = useUser();
    const { projectID } = useParams();
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [allMembers, setAllMembers] = useState<Members[]>([]);
    const { enqueueSnackbar } = useSnackbar();
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState<Members | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [isManager, setIsManager] = useState(false);

    const openInviteModal = () => {
        setIsInviteModalOpen(true);
    };

    const closeInviteModal = () => {
        setIsInviteModalOpen(false);
    };

    const {
        register,
        handleSubmit,
        control,
        setValue,
        formState: { errors },
    } = useForm<ProjectSettings>({
        defaultValues: {
            name: "",
            description: "",
            readme: "",
            additional_info: "",
            for_who: "",
            doing_what: "",
            owner: null,
            members: [],
            managers: [],
        },
    });

    const handleSearch = async (searchQuery: string) => {
        try {
            const response = await axiosInstance.get<User[]>(`${API_URLS.BASE_URL}/users/filter?user_id=${user?.id}&filter=${searchQuery}`);
            const user_friends = await axiosInstance.get<User[]>(`${API_URLS.BASE_URL}/users/friends?id=${user?.id}`);

            const filteredUsers = response.data;
            const friends = user_friends.data;
            
            const friendIds = new Set(friends.map(friend => friend.id));
            const mutualUsers = filteredUsers.filter(user => friendIds.has(user.id));
            setSearchResults(mutualUsers);
        } catch (error) {
            console.error('Error searching users:', error);
            enqueueSnackbar(`Error searching users: ${error.response?.data?.detail ?? 'Unknown error'}`, { variant: 'error' });}
    };

    const fetchProjectSettings = async () => {
        try {
            const response = await axiosInstance.get(`${API_URLS.API_SERVER_URL}/projects/${projectID}`);
            const projectData = response.data;

            const membersResponse = await axiosInstance.get(`${API_URLS.BASE_URL}/users/projects/${projectID}`);
            const usersData = membersResponse.data as Members[];
            setAllMembers(usersData);

            setValue("name", projectData.name || "");
            setValue("description", projectData.description || "");
            setValue("readme", projectData.readme || "");
            setValue("additional_info", projectData.additional_info || "");
            setValue("for_who", projectData.for_who || "");
            setValue("doing_what", projectData.doing_what || "");
            setValue("owner", usersData.find(member => member.id === projectData.owner) || null);
            setValue("members", usersData || []);
            setValue("managers", projectData.managers.map(managerId => usersData.find(member => member.id === managerId)).filter(Boolean) || []);
            setIsManager(projectData.managers.includes(user?.id));
            setIsOwner(projectData.owner === user?.id);
        } catch (error) {
            console.error("Failed to fetch project settings", error);
            enqueueSnackbar(`Error fetching project settings: ${error.response?.data?.detail ?? 'Unknown error'}`, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Call fetchProjectSettings within useEffect for the initial data load
    useEffect(() => {
        fetchProjectSettings();
    }, [projectID, setValue]);


    const onSubmit = async (data: ProjectSettings) => {
        try {
            const patchData = {
                name: data.name,
                description: data.description,
                readme: data.readme,
                additional_info: data.additional_info,
                for_who: data.for_who,
                doing_what: data.doing_what,
            };

            const url = `${API_URLS.API_SERVER_URL}/projects/${projectID}`;
            await axiosInstance.patch(url, patchData);
            console.log("Project settings updated successfully");
            enqueueSnackbar(`Project settings updated successfully`, { variant: 'success' });
            await fetchProjectSettings();
        } catch (error) {
            console.error('Error submitting project settings:', error);
            enqueueSnackbar(`Error submitting project settings: ${error.response?.data?.detail ?? 'Unknown error'}`, { variant: 'error' });
        }
    };

    const handleAddMember = async (friendId: string) => {
        try {
            const url = `${API_URLS.API_SERVER_URL}/projects/${projectID}/members/add`;
            await axiosInstance.post(url, { sender_id: user?.id, member_id: friendId });
            closeInviteModal();
            await fetchProjectSettings();
        } catch (error) {
            console.error('Error adding member:', error);
            enqueueSnackbar(`Error adding member: ${error.response?.data?.detail ?? 'Unknown error'}`, { variant: 'error' });
        }
    };

    const handleManagerSelect = async (manager: Members) => {
        const currentManagers = control._formValues.managers || [];
        if (!currentManagers.find((m: Members) => m.id === manager.id)) {
            try {
                const url = `${API_URLS.API_SERVER_URL}/projects/${projectID}/managers/assign`;
                await axiosInstance.post(url, { sender_id: user?.id, member_id: manager.id });

                await fetchProjectSettings();
            } catch (error) {
                console.error('Error adding manager:', error);
                enqueueSnackbar(`Error adding manager: ${error.response?.data?.detail ?? 'Unknown error'}`, { variant: 'error' });
            }
        }
    };


    const handleManagerRemove = async (managerId: string) => {
        try {
            const url = `${API_URLS.API_SERVER_URL}/projects/${projectID}/managers/unassign`;
            await axiosInstance.post(url, { sender_id: user?.id, member_id: managerId });

            await fetchProjectSettings();
        } catch (error) {
            console.error('Error removing manager:', error);
            enqueueSnackbar(`Error removing manager: ${error.response?.data?.detail ?? 'Unknown error'}`, { variant: 'error' });
        }
    };

    const handleMemberRemove = async (memberId: string) => {
        try {
            const url = `${API_URLS.API_SERVER_URL}/projects/${projectID}/members/remove`;
            await axiosInstance.post(url, { sender_id: user?.id, member_id: memberId });

            await fetchProjectSettings();
        } catch (error) {
            console.error('Error removing member:', error);
            enqueueSnackbar(`Error removing member: ${error.response?.data?.detail ?? 'Unknown error'}`, { variant: 'error' });
        }
    };

    const handleOwnerSelect = (owner: Members) => {
        setSelectedOwner(owner);
        setIsConfirmDialogOpen(true);
    };
    
    const confirmOwnerAssignment = async () => {
        if (!selectedOwner) return;
    
        try {
            const url = `${API_URLS.API_SERVER_URL}/projects/${projectID}/owner/assign`;
            await axiosInstance.post(url, { sender_id: user?.id, member_id: selectedOwner.id });
            enqueueSnackbar(`New owner assigned successfully`, { variant: 'success' });
            await fetchProjectSettings();
        } catch (error) {
            console.error('Error selecting new owner:', error);
            console.log(user.id, selectedOwner.id)
            enqueueSnackbar(`Error selecting new owner: ${error.response?.data?.detail ?? 'Unknown error'}`, { variant: 'error' });
        } finally {
            setIsConfirmDialogOpen(false);
            setSelectedOwner(null);
        }
    };

    const handleExit = () => {
        navigate(`/projects/${projectID}/editor/summary`);
    };

    if (loading) {
        return <p>Loading...</p>;
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg mx-auto p-6 rounded-lg">
            <div>
                <Label htmlFor="name" className="block text-sm font-medium text-gray-700">Project Name</Label>
                <Input
                    id="name"
                    {...register("name", { required: true })}
                    placeholder="Enter project name"
                    className="mt-1 block w-full"
                    disabled={!isManager}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">This field is required</p>}
            </div>

            <div>
                <Label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</Label>
                <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Enter project description"
                    className="mt-1 block w-full"
                    disabled={!isManager}
                />
            </div>

            <div>
                <Label htmlFor="readme" className="block text-sm font-medium text-gray-700">Readme</Label>
                <Textarea
                    id="readme"
                    {...register("readme")}
                    placeholder="Enter readme content"
                    className="mt-1 block w-full"
                    disabled={!isManager}
                />
            </div>

            <div>
                <Label htmlFor="for_who" className="block text-sm font-medium text-gray-700">For who</Label>
                <Textarea
                    id="for_who"
                    {...register("for_who")}
                    placeholder="Enter readme content"
                    className="mt-1 block w-full"
                    disabled={!isManager}
                />
            </div>

            <div>
                <Label htmlFor="doing_what" className="block text-sm font-medium text-gray-700">Doing what</Label>
                <Textarea
                    id="doing_what"
                    {...register("doing_what")}
                    placeholder="Enter readme content"
                    className="mt-1 block w-full"
                    disabled={!isManager}
                />
            </div>

            <div>
                <Label htmlFor="additional_info" className="block text-sm font-medium text-gray-700">Additional info</Label>
                <Textarea
                    id="additional_info"
                    {...register("additional_info")}
                    placeholder="Enter readme content"
                    className="mt-1 block w-full"
                    disabled={!isManager}
                />
            </div>

            <div>
                <Label htmlFor="owner" className="block text-sm font-medium text-gray-700">Owner</Label>
                    {isOwner ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="mt-1 w-full">
                                {control._formValues.owner ? control._formValues.owner.username : "Select Owner"}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {allMembers.length > 0 ? (
                                allMembers.map((member) => (
                                    <DropdownMenuItem key={member.id} onClick={() => handleOwnerSelect(member)}>
                                        {member.username}
                                    </DropdownMenuItem>
                                ))
                            ) : (
                                <DropdownMenuItem disabled>No members available</DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <p className="mt-1 text-sm text-gray-500">You are not authorized to change the project owner.</p>
                )}

                <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Ownership Transfer</DialogTitle>
                        </DialogHeader>
                        <p>Are you sure you want to assign <strong>{selectedOwner?.username}</strong> as the new owner?</p>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={confirmOwnerAssignment} className="bg-blue-500 text-white">
                                Confirm
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div>
                <Label htmlFor="members" className="block text-sm font-medium text-gray-700">Members</Label>
                    <Button className="mt-1 w-full" onClick={openInviteModal}>Add Members</Button>
                <div className="mt-2">
                    {(control._formValues.members || []).map((member, index) => (
                        <span key={index} className="inline-flex items-center bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full mr-2">
                            {member.username}
                            {isManager && (
                                <button onClick={() => handleMemberRemove(member.id)} className="ml-1 text-red-500 hover:text-red-700">
                                    &times;
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            </div>

            <div>
                <Label htmlFor="managers" className="block text-sm font-medium text-gray-700">Managers</Label>
                {isOwner ? (
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="mt-1 w-full">Select Managers</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {allMembers.length > 0 ? (
                                    allMembers
                                        .filter((member) => !(control._formValues.managers || []).some((m) => m.id === member.id))
                                        .map((member) => (
                                            <DropdownMenuItem
                                                key={member.id}
                                                onClick={() => handleManagerSelect(member)}
                                            >
                                                {member.username}
                                            </DropdownMenuItem>
                                        ))
                                ) : (
                                    <DropdownMenuItem disabled>No members available</DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="mt-2">
                            {(control._formValues.managers || []).map((manager, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full mr-2 cursor-pointer"
                                    onClick={() => navigate(`/profile/${manager.id}`)} 
                                >
                                    {manager.username}
                                    <button onClick={() => handleManagerRemove(manager.id)} className="ml-1 text-red-500 hover:text-red-700">
                                        &times;
                                    </button>
                                </span>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="mt-2">
                        {(control._formValues.managers || []).map((manager, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full mr-2 cursor-pointer"
                                onClick={() => navigate(`/profile/${manager.id}`)} 
                            >
                                {manager.username}
                            </span>
                        ))}
                        <p className="mt-1 text-sm text-gray-500">Only the project owner can assign or remove managers.</p>
                    </div>
                )}
            </div>

            <div className="flex justify-between">
                <Button type="submit" className={`w-1/2 mr-2 ${isManager ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-300 cursor-not-allowed"} text-white`} disabled={!isManager}>
                    Save Settings
                </Button>
                <Button type="button" className="w-1/2 bg-red-500 hover:bg-red-600 text-white" onClick={handleExit}>
                    Exit Settings
                </Button>
            </div>

            <InviteModal isOpen={isInviteModalOpen} onClose={closeInviteModal}>
                <Search
                    onSearch={handleSearch}
                    searchResults={searchResults}
                    friends={[]}
                    onClick={handleAddMember}
                    userId={user.id}
                    actionType='addMember'
                />
            </InviteModal>
        </form>
    );
};

export default ProjectSettings;
