from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.document import DocumentResponse, DocumentSearchRequest, DocumentSearchResponse
from app.services.rag_service import RAGService
from app.services.ai_service import AIService

router = APIRouter(
    prefix="/projects/{project_id}/documents",
    tags=["Project Knowledge & RAG"],
)


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_project_document(
    project_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload and index a domain-specific document (PDF, TXT, MD) into the project knowledge base.
    """
    rag_service = RAGService(db, AIService())
    return rag_service.process_and_index_file(
        project_id=project_id,
        current_user=current_user,
        file=file,
    )


@router.get(
    "",
    response_model=List[DocumentResponse],
)
def list_project_documents(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all indexed reference documents in the project knowledge base.
    """
    rag_service = RAGService(db)
    return rag_service.list_documents(
        project_id=project_id,
        current_user=current_user,
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project_document(
    project_id: UUID,
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a document and its embeddings from the project knowledge base.
    """
    rag_service = RAGService(db)
    rag_service.delete_document(
        project_id=project_id,
        document_id=document_id,
        current_user=current_user,
    )
    return None


@router.post(
    "/search",
    response_model=DocumentSearchResponse,
)
def search_project_knowledge(
    project_id: UUID,
    request: DocumentSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Perform semantic search over the project knowledge base.
    """
    rag_service = RAGService(db, AIService())
    rag_service._verify_project_access(project_id, current_user)
    results = rag_service.retrieve_relevant_chunks(
        project_id=project_id,
        query=request.query,
        top_k=request.top_k,
    )
    return DocumentSearchResponse(
        query=request.query,
        results=results,
    )
