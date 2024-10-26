import { ModeToggle } from "./ModeToggle";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { useUser } from './UserProvider';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
    const { user, logout } = useUser();
    const location = useLocation();
    return (
        <nav className="flex items-center justify-between px-6 py-4 h-16 z-50 relative">
            <Link to="/" className="text-3xl font-semibold">Visio</Link>
            <ul className="flex items-center gap-6 font-medium">
                {user ? (
                    <>
                        <li>
                            <Link to="/create-project"
                                className={location.pathname === "/create-project" ? "navbar-active" : "navbar-deactive"}
                            >New Project</Link>
                        </li>
                        <li>
                            <Link to="/projects"
                                className={location.pathname === "/projects" ? "navbar-active" : "navbar-deactive"}
                            >Projects</Link>
                        </li>
                        <li>
                            <Link to="/collaborators"
                                className={location.pathname === "/collaborators" ? "navbar-active" : "navbar-deactive"}
                            >Collaborators</Link>
                        </li>
                    </>
                ) : (
                    <li>
                        Example
                    </li>
                )}
                <li>
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <Avatar>
                                <AvatarImage src={user?.avatarurl} alt="@shadcn" />
                                <AvatarFallback>?</AvatarFallback>
                            </Avatar>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="dropdown-navbar-menu">
                            {user ? (
                                <>
                                    <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                        <Link to={`/profile/${user.id}`} style={{ width: "100%" }}>Profile</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={logout}>
                                        <Link to="/" style={{ width: "100%" }}>Logout</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem >
                                        <ModeToggle />
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <>
                                    <DropdownMenuItem>
                                        <Link to="/login" style={{ width: "100%" }}>Login</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Link to="/register" style={{ width: "100%" }}>Register</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem >
                                        <ModeToggle />
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </li>
            </ul>
        </nav>
    );
};

export default Navbar;