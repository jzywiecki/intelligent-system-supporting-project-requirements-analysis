import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const UserAvatars = ({ usersEditing, currentUser }) => (
    <TooltipProvider>
        <div className="relative flex items-center justify-center space-x-2 group" style={{ width: '50%' }}>
            <div className="flex -space-x-3">
                {usersEditing.map((user, index) => (
                    <img
                        key={index}
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
                        style={{ transform: `translateX(-${index * 6}px)` }}
                    />
                ))}
            </div>
            <Tooltip>
                <TooltipTrigger className="flex">
                    <div className="absolute inset-0" />
                </TooltipTrigger>
                <TooltipContent>
                    <div className="flex flex-col">
                        {usersEditing.map((user, index) => (
                            <span key={index} className="text-sm text-gray-700">
                                {user.name === currentUser.name ? <>You</> : <>{user.name}</>}
                            </span>
                        ))}
                    </div>
                </TooltipContent>
            </Tooltip>
        </div>
    </TooltipProvider>
);

export default UserAvatars;