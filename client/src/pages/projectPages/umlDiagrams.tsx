import { useContext, useEffect, useRef, useState } from "react";
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
import mermaid from "mermaid";

const UMLDiagrams: React.FC = () => {
    const { projectID } = useParams<{ projectID: string }>();
    const [umlDiagrams, setUmlDiagrams] = useState<any[]>([]);
    const [selectedDiagramIndex, setSelectedDiagramIndex] = useState<number>(0);
    const [mermaidDiagram, setMermaidDiagram] = useState<string>("");
    const diagramRef = useRef<HTMLDivElement>(null);
    const { regenerate, setProjectRegenerateID, setComponentRegenerate } = useContext(RegenerateContext);

    const fetchData = async () => {
        try {
            const response = await axiosInstance.get(`${API_URLS.API_SERVER_URL}/model/uml_diagram_class/${projectID}`);
            console.log(response.data)
            setUmlDiagrams(response.data.uml_diagram_class);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    const parseUMLToClassDiagramMermaid = (umlData: any): string => {
        if (!umlData || typeof umlData !== 'object') {
            throw new Error("Invalid UML data format");
        }

        let diagram = 'classDiagram\n';

        diagram += `class ${umlData.name} {\n`;

        umlData.attributes.forEach((attr: any) => {
            diagram += `  ${attr.type} ${attr.name}\n`;
        });

        umlData.methods.forEach((method: any) => {
            diagram += `  ${method.return_type} ${method.name}()\n`;
        });

        diagram += '}\n';

        umlData.relationships.forEach((rel: any) => {
            diagram += `${umlData.name} --> ${rel.target}\n`;
        });

        return diagram;
    };

    useEffect(() => {
        if (projectID) {
            setProjectRegenerateID(projectID);
        }
        setComponentRegenerate("UML Diagrams");
        fetchData();
    }, [projectID, regenerate]);

    useEffect(() => {
        if (umlDiagrams.length > 0) {
            const diagram = parseUMLToClassDiagramMermaid(umlDiagrams[selectedDiagramIndex]);
            setMermaidDiagram(diagram || "Error generating diagram");
        }
    }, [umlDiagrams, selectedDiagramIndex]);

    const renderDiagram = async () => {
        if (diagramRef.current && mermaidDiagram) {
            try {
                const { svg } = await mermaid.render("theGraph", mermaidDiagram);
                diagramRef.current.innerHTML = svg;
            } catch (error) {
                diagramRef.current.innerHTML = "Invalid diagram syntax";
                console.error("Mermaid rendering error:", error);
            }
        }
    };

    useEffect(() => {
        renderDiagram();
    }, [mermaidDiagram]);

    return (
        <div>
            <div className="flex justify-center items-center mb-4">
                <h1 className="text-3xl font-semibold text-center mt-8">UML Diagrams</h1>
            </div>
            <div className="flex justify-center items-center mb-4">
                <div className="flex space-x-4">
                    {umlDiagrams.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedDiagramIndex(index)}
                            className={`px-4 py-2 border rounded-md ${index === selectedDiagramIndex ? "bg-blue-500 text-white" : "bg-gray-200"
                                }`}
                        >
                            Diagram {index + 1}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex justify-center items-center">
                <Card>
                    <CardHeader>
                        <CardTitle>UML Diagram {selectedDiagramIndex + 1}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div ref={diagramRef}></div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default UMLDiagrams;
