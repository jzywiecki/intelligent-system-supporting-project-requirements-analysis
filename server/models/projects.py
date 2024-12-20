from bson import ObjectId
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

from .actors import Actors
from .business_scenarios import BusinessScenarios
from .elevator_speech import ElevatorSpeeches
from .mottos import Mottos
from .project_schedule import ProjectSchedule
from .requirements import Requirements
from .risks import Risks
from .specifications import Specifications
from .strategy import Strategy
from .title import Title
from .database_schema import DatabaseSchema
from .logo import Logo
from .mockups import Mockups
from .suggested_technologies import SuggestedTechnologies
from .uml_diagram_class import UMLDiagramClasses


class Project(BaseModel):
    """
    Represents the project the client is working with.
    includes configuration information and
    the project's current state.
    """

    id: ObjectId = Field(alias="_id", default=None)
    name: str
    description: str
    # readme: str
    owner: ObjectId
    for_who: str
    doing_what: str
    additional_info: str
    members: List[ObjectId]
    managers: List[ObjectId]
    created_at: datetime = Field(default=datetime.now())
    actors: Optional[Actors] = None
    business_scenarios: Optional[BusinessScenarios] = None
    elevator_speeches: Optional[ElevatorSpeeches] = None
    mottos: Optional[Mottos] = None
    project_schedule: Optional[ProjectSchedule] = None
    requirements: Optional[Requirements] = None
    risks: Optional[Risks] = None
    specifications: Optional[Specifications] = None
    strategy: Optional[Strategy] = None
    title: Optional[Title] = None
    database_schema: Optional[DatabaseSchema] = None
    suggested_technologies: Optional[SuggestedTechnologies] = None
    uml_diagram_class: Optional[UMLDiagramClasses] = None
    mockups: Optional[Mockups] = None
    logo: Optional[Logo] = None
    chat_id: Optional[ObjectId] = None
    ai_chat_id: Optional[ObjectId] = None

    def set_default_values(self):
        self.actors = Actors()
        self.business_scenarios = BusinessScenarios()
        self.elevator_speeches = ElevatorSpeeches()
        self.mottos = Mottos()
        self.project_schedule = ProjectSchedule()
        self.requirements = Requirements()
        self.risks = Risks()
        self.specifications = Specifications()
        self.strategy = Strategy()
        self.title = Title()
        self.database_schema = DatabaseSchema()
        self.uml_diagram_class = UMLDiagramClasses()
        self.suggested_technologies = SuggestedTechnologies()
        self.logo = Logo()
        self.mockups = Mockups()

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Projects(BaseModel):
    projects: List[Project]


class ComponentIdentify(Enum):
    """
    Field names to identify components
    (e.g. These are used to access the fields in the MongoDB documents.)
    Should be consistent with the field names in the Project model.
    """

    ACTORS = "actors"
    BUSINESS_SCENARIOS = "business_scenarios"
    ELEVATOR_SPEECH = "elevator_speeches"
    MOTTO = "mottos"
    PROJECT_SCHEDULE = "project_schedule"
    REQUIREMENTS = "requirements"
    RISKS = "risks"
    SPECIFICATIONS = "specifications"
    STRATEGY = "strategy"
    TITLE = "title"
    DATABASE_SCHEMA = "database_schema"
    LOGO = "logo"
    SUGGESTED_TECHNOLOGIES = "suggested_technologies"
    MOCKUPS = "mockups"
    UML_DIAGRAM_CLASS = "uml_diagram_class"


class ProjectPatchRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    # readme: Optional[str] = None
    for_who: Optional[str] = None
    doing_what: Optional[str] = None
    additional_info: Optional[str] = None
