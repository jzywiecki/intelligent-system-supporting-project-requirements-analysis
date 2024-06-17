import React, { useEffect, useState, useContext } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useParams } from "react-router-dom";
import axios from "axios";
import RegenerateContext from '@/components/contexts/RegenerateContext';

const ElevatorSpeech: React.FC = () => {
    const { projectID } = useParams();
    const [content, setContent] = useState(" ");
    const { regenerate, setProjectRegenerateID, setComponentRegenerate } = useContext(RegenerateContext);

    function getComponentName() {
        return "elevator_speech";
    }

    const fetchData = async () => {
        try {
            const response = await axios.get(`http://localhost:8000/elevator_speech/${projectID}`);
            setContent(response.data.content);
            if (projectID) {
                setProjectRegenerateID(projectID);
            }
            setComponentRegenerate(getComponentName())
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, [projectID, regenerate]);

    return (
        <Card className="max-w-lg mx-auto my-8">
            <CardHeader>
                <CardTitle>Elevator speech</CardTitle>
                <CardDescription>Content for pitching idea</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea style={{ height: 'calc(100vh - 300px)' }}>
                    <h1 className="text-2xl font-semibold">{content}</h1>
                </ScrollArea>
            </CardContent>
            <CardFooter className="flex justify-end">
                <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                    Edit
                </button>
            </CardFooter>
        </Card>
    );
};

export default ElevatorSpeech;