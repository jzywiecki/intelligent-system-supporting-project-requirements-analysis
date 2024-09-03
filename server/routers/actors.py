from fastapi import APIRouter
from .common import get_module
from models import ComponentIdentify

router = APIRouter(
    tags=["model"],
    prefix="/model",
)


@router.get("/actors/{project_id}")
def get_actors(project_id: str):
    return get_module(project_id, ComponentIdentify.ACTORS.value)
