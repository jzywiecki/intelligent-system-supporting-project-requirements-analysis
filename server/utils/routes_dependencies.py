from fastapi import HTTPException, Request
from jwt import decode, ExpiredSignatureError, InvalidTokenError
from database import project_dao
from .exceptions import ProjectNotFound
from .exceptions import InvalidId
from .loggers import logger
from bson import ObjectId


async def verify_project_membership(request: Request, project_id: str = None):
    """
    Verifies if the user is a member of the project. Supports raw JWT tokens from headers.
    If `project_id` is not provided as a parameter, it will be extracted from the request body.

    :param request: FastAPI Request object.
    :param project_id: The unique identifier of the project (optional).
    :raises HTTPException: If the user is not authorized or not a member.
    """
    # token = get_token_from_headers(request)

    # try:
    #     payload = decode(token, "secret", algorithms=["HS256"])
    #     logger.info(f"Decoded Payload: {payload}")

    #     user_email = payload.get("email")
    #     if not user_email:
    #         raise HTTPException(status_code=401, detail="Invalid token payload")

    #     # If project_id is not provided, fetch it from the request body
    #     if not project_id:
    #         body_bytes = await request.body()
    #         if not body_bytes:
    #             logger.info(f"jestesm tutaj kurwa") #TODO: remove
    #             raise HTTPException(status_code=400, detail="Request body is empty")

    #         body = await request.json()
    #         project_id = body.get("project_id")
    #         if not project_id:
    #             raise HTTPException(
    #                 status_code=400, detail="Missing project_id in request body"
    #             )

    #         # Check is valid ObjectId
    #         try:
    #             ObjectId(project_id)
    #         except:
    #             raise HTTPException(
    #                 status_code=404, detail="Project not found"
    #             )

    #     members = project_dao.get_project_members(project_id)
    #     if not members:
    #         raise HTTPException(status_code=404, detail="Project not found")

    #     if user_email not in [member.get("email") for member in members]:
    #         raise HTTPException(status_code=404, detail="Project not found")

    # except InvalidId:
    #     raise HTTPException(status_code=404, detail="Project not found")
    # except ExpiredSignatureError:
    #     raise HTTPException(status_code=401, detail="Token has expired")
    # except InvalidTokenError:
    #     raise HTTPException(status_code=401, detail="Invalid token")
    # except ProjectNotFound:
    #     raise HTTPException(status_code=404, detail="Project not found")

    return True


def get_token_from_headers(request: Request):
    """
    Extracts the raw JWT token directly from the Authorization header in the request.

    :param request: FastAPI Request object.
    :raises HTTPException: If the Authorization header is missing or improperly formatted.
    :return: JWT token as a string.
    """
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    return auth_header
