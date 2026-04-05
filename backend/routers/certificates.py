import uuid
import qrcode
import io
import base64
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter(prefix="/api/certificates", tags=["certificates"])


def generate_qr_base64(data: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{encoded}"


@router.post("/generate", response_model=schemas.CertificateOut)
def generate_certificate(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    total_scenarios = db.query(models.Scenario).count()
    completed = db.query(models.UserProgress).filter(
        models.UserProgress.user_id == current_user.id,
        models.UserProgress.completed == True,
        models.UserProgress.correct == True,
    ).count()

    if total_scenarios > 0 and completed < total_scenarios * 0.5:
        raise HTTPException(status_code=400, detail="Пройдите не менее 50% сценариев для получения сертификата")

    existing = db.query(models.Certificate).filter(
        models.Certificate.user_id == current_user.id
    ).first()
    if existing:
        return schemas.CertificateOut(
            certificate_id=existing.certificate_id,
            username=current_user.username,
            level_achieved=existing.level_achieved,
            score=existing.score,
            issued_at=existing.issued_at,
            qr_code_url=existing.qr_code_url,
        )

    import os
    cert_id = str(uuid.uuid4())[:8].upper()
    base_url = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:3000").replace(":8000", ":3000")
    verify_url = f"{base_url}/certificate/{cert_id}"
    qr_code = generate_qr_base64(verify_url)

    certificate = models.Certificate(
        user_id=current_user.id,
        certificate_id=cert_id,
        level_achieved=current_user.league,
        score=current_user.total_score,
        qr_code_url=qr_code,
    )
    db.add(certificate)
    db.commit()
    db.refresh(certificate)

    return schemas.CertificateOut(
        certificate_id=cert_id,
        username=current_user.username,
        level_achieved=current_user.league,
        score=current_user.total_score,
        issued_at=certificate.issued_at,
        qr_code_url=qr_code,
    )


@router.get("/verify/{cert_id}")
def verify_certificate(cert_id: str, db: Session = Depends(get_db)):
    cert = db.query(models.Certificate).filter(models.Certificate.certificate_id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Сертификат не найден")
    user = db.query(models.User).filter(models.User.id == cert.user_id).first()
    return {
        "valid": True,
        "certificate_id": cert.certificate_id,
        "username": user.username,
        "level_achieved": cert.level_achieved,
        "score": cert.score,
        "issued_at": cert.issued_at,
    }
