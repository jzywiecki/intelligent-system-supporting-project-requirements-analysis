import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ComponentUserMap {
    [componentName: string]: Set<string>;
}

interface UserEditsContextType {
    componentUserMap: ComponentUserMap;
    addUserToComponent: (componentName: string, userId: string) => void;
    removeUserFromComponent: (componentName: string, userId: string) => void;
    addUsersToComponents: (userList: { componentId: string; users: string[] }[]) => void;
}

const UserEditsContext = createContext<UserEditsContextType | null>(null);

interface UserEditsProviderProps {
    children: ReactNode;
}

export const UserEditsProvider: React.FC<UserEditsProviderProps> = ({ children }) => {
    const [componentUserMap, setComponentUserMap] = useState<ComponentUserMap>({});

    const addUserToComponent = (componentName: string, userId: string) => {
        setComponentUserMap(prevMap => ({
            ...prevMap,
            [componentName]: new Set([...(prevMap[componentName] || []), userId]),
        }));
    };

    const removeUserFromComponent = (componentName: string, userId: string) => {
        setComponentUserMap(prevMap => {
            const updatedSet = new Set(prevMap[componentName]);
            updatedSet.delete(userId);
            return {
                ...prevMap,
                [componentName]: updatedSet,
            };
        });
    };

    const addUsersToComponents = (userList: { component: string; users: string[] }[]) => {
        setComponentUserMap(() => {
            const newMap: Record<string, Set<string>> = {};
            userList.forEach(({ component, users }) => {
                newMap[component] = new Set(users);
            });
            return newMap;
        });
    };

    return (
        <UserEditsContext.Provider value={{ componentUserMap, addUserToComponent, removeUserFromComponent, addUsersToComponents }}>
            {children}
        </UserEditsContext.Provider>
    );
};

export const useUserEdits = (): UserEditsContextType => {
    const context = useContext(UserEditsContext);
    if (!context) {
        throw new Error("useUserEdits must be used within a UserEditsProvider");
    }
    return context;
};
