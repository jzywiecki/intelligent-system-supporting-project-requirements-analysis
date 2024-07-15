import ray

from typing import List
from pydantic import BaseModel

from models.model import generate_model, save_model_to_database
from modules.actors.routes import ActorsModule


class Actor(BaseModel):
    name: str
    description: str


class Actors(BaseModel):
    actors: List[Actor]


@ray.remote
def generate_actors(for_who: str, doing_what: str, additional_info: str, project_id: str):
    actors = generate_model(ActorsModule, for_who, doing_what, additional_info, Actors)
    save_model_to_database(project_id, "actors", actors)