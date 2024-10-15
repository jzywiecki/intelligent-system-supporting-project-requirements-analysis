import { ComponentIsNotExist } from "./exceptions.js";


export const Components = Object.freeze({
    ACTORS: {id: 1, name: "actors"},
    BUSINESS_SCENARIOS: {id: 2, name: "business_scenarios"},
    ELEVATOR_SPEECH: {id: 3, name: "elevator_speech"},
    MOTTO: {id: 4, name: "motto"},
    PROJECT_SCHEDULE: {id: 5, name: "project_schedule"},
    REQUIREMENTS: {id: 6, name: "requirements"},
    RISKS: {id: 7, name: "risks"},
    SPECIFICATIONS: {id: 8, name: "specifications"},
    STRATEGY: {id: 9, name: "strategy"},
    TITLE: {id: 10, name: "title"},
    DATABASE_SCHEMA: {id: 11, name: "database_schema"},
    LOGO: {id: 12, name: "logo"},
});


export const getComponentById = (id) => {
    const model = Object.values(Components).find(model => model.id === id);

    if (!model) {
        throw new ComponentIsNotExist(`Model with id ${id} does not exist.`);
    }
    return model;
}


export const isComponentIdCorrect = (id) => {
    return id >= 1 && id <= 12;
}
