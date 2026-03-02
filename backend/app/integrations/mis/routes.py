from fastapi import APIRouter

router = APIRouter(prefix="/api/integrations/mis", tags=["MIS"])

@router.get("/health")
def mis_health():
    return {"status": "mis router active"}