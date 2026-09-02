from pydantic import BaseModel, Field
from typing import Optional


class LoginRequest(BaseModel):
    usuario: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4, max_length=128)


class LoginResponse(BaseModel):
    token: str
    user: "UserBasic"


class UserBasic(BaseModel):
    id: int
    nombre: str
    usuario: str
    correo: str
    rol_principal: int
    roles: list[int] = [0]
    areas: list[str]
    requiere_cambio_password: bool = False


class RefreshTokenRequest(BaseModel):
    token: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=4)
    new_password: str = Field(..., min_length=6, max_length=128)


class ForgotPasswordRequest(BaseModel):
    correo: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6, max_length=128)


class MessageResponse(BaseModel):
    message: str


class TempPasswordResponse(BaseModel):
    message: str
    temp_password: str
