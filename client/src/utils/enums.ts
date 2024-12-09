export const Components = Object.freeze({
    ACTORS: { id: 1, name: "actors" },
    BUSINESS_SCENARIOS: { id: 2, name: "business_scenarios" },
    ELEVATOR_SPEECH: { id: 3, name: "elevator_speeches" },
    MOTTO: { id: 4, name: "mottos" },
    PROJECT_SCHEDULE: { id: 5, name: "project_schedule" },
    REQUIREMENTS: { id: 6, name: "requirements" },
    RISKS: { id: 7, name: "risks" },
    SPECIFICATIONS: { id: 8, name: "specifications" },
    STRATEGY: { id: 9, name: "strategy" },
    TITLE: { id: 10, name: "title" },
    DATABASE_SCHEMA: { id: 11, name: "database_schema" },
    LOGO: { id: 12, name: "logo" },
    UML: { id: 13, name: "uml_diagram_class" },
    // SUMMARY: { id: 14, name: "summary" },

});


export const getComponentById = (id: number) => {
    return Object.values(Components).find(model => model.id == id);
}


export const getComponentyByName = (name: string) => {
    return Object.values(Components).find(model => model.name == name);
}


export const isComponentIdCorrect = (id: number) => {
    return id >= 1 && id <= 12;
}


export type AiModels = 'gpt-35-turbo' | 'gpt-4o-mini' | 'llama-3.2' | 'dall-e-3' | 'dall-e-2';


export const AITextModels = Object.freeze({
    GPT35Turbo: { id: 1, name: "gpt-35-turbo" },
    GPT4oMini: { id: 2, name: "gpt-4o-mini" },
    Llama32: { id: 3, name: "llama-3.2" }
});


export const AIImageModels = Object.freeze({
    DALL_E3: { id: 1, name: "dall-e-3" },
    DALL_E2: { id: 2, name: "dall-e-2" },
});


export const getAiIdByName = (name: string) => {
    const model = Object.values(AITextModels).find(model => model.name == name);
    if (model) {
        return model.id;
    }

    return Object.values(AIImageModels).find(model => model.name == name);
}

export const RequestType = Object.freeze({
    QUESTION: { id: 1, name: "question" },
    REGENERATION: { id: 2, name: "regeneration" },
    UPDATE: { id: 3, name: "update" },
});
