import { useContext, useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useParams } from "react-router-dom";
import axiosInstance from "@/services/api";
import { API_URLS } from "@/services/apiUrls";
import RegenerateContext from "@/components/contexts/RegenerateContext";
import { parseDatabaseToErDiagramMermaid } from "@/utils/mermaid";
import mermaid from "mermaid";

const DatabaseDiagram: React.FC = () => {
    const { projectID } = useParams<{ projectID: string }>();
    const [database, setDatabase] = useState<any>(null);
    const [mermaidDiagram, setMermaidDiagram] = useState<string>("");
    const { regenerate, setProjectRegenerateID, setComponentRegenerate } = useContext(RegenerateContext);

    function getComponentName() {
        return "Database schema";
    }

    const fetchData = async () => {
        try {
            const response = await axiosInstance.get(`${API_URLS.API_SERVER_URL}/model/database_schema/${projectID}`);
            setDatabase(response.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        if (projectID) {
            setProjectRegenerateID(projectID);
        }
        setComponentRegenerate(getComponentName());
        fetchData();
    }, [projectID, regenerate]);

    useEffect(() => {
        if (database) {
            const diagram = parseDatabaseToErDiagramMermaid(database);
            setMermaidDiagram(diagram || "Error generating diagram");
        }
    }, [database]);

    useEffect(() => {
        if (mermaidDiagram) {
            mermaid.initialize({ startOnLoad: true });
            mermaid.contentLoaded(); // Render Mermaid diagrams
        }
    }, [mermaidDiagram]);

    return (
        <div>
            <div className="flex justify-center items-center mb-4">
                <h1 className="text-3xl font-semibold text-center mt-8">Database schema</h1>
            </div>
            <div className="flex justify-center items-center">
                <div className="mermaid">
                    {mermaidDiagram || ""}
                </div>
            </div>
        </div>
    );
};

export default DatabaseDiagram;
