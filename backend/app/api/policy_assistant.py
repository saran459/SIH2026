from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.report import PolicyAssistantQuery, PolicyAssistantResponse
from app.api.deps import get_current_user
from app.services.policy_assistant import answer_policy_query

router = APIRouter(prefix="/policy-assistant", tags=["Policy Assistant"])

@router.post("/ask", response_model=PolicyAssistantResponse)
def ask_policy_assistant(
    data: PolicyAssistantQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return answer_policy_query(
        db=db,
        query=data.query,
        application_id=data.application_id,
        user_institution_id=current_user.institution_id
    )
