from pydantic import BaseModel, Field
from typing import List


class ElevatorSpeeches(BaseModel):
    elevator_speeches: List[str] = Field(default_factory=list)

    class Config:
        extra = "forbid"
