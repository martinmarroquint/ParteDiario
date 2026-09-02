from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    usuario: str = Field(..., min_length=2, max_length=50)
    correo: str = Field("", max_length=150)
    grado: str = Field("", max_length=20)
    dni: str = Field("", max_length=20)
    activo: bool = True


class UserCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    usuario: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=4, max_length=128)
    correo: str = Field("", max_length=150)
    grado: str = Field("", max_length=20)
    dni: str = Field("", max_length=20)
    roles: list[int] = Field(default=[0])
    areas: list[str] = Field(default=[])


class UserUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    correo: Optional[str] = Field(None, max_length=150)
    grado: Optional[str] = Field(None, max_length=20)
    dni: Optional[str] = Field(None, min_length=8, max_length=8)
    activo: Optional[bool] = None
    roles: Optional[list[int]] = None
    areas: Optional[list[str]] = None


class User(UserBase):
    id: int
    password: str = ""
    roles: list[int] = [0]
    areas: list[str] = []
    creado_en: Optional[str] = None
    requiere_cambio_password: bool = False
    salt: str = ""

    class Config:
        from_attributes = True


class UserRoleAssignment(BaseModel):
    user_id: int
    rol: int
    area: str
    activo: bool = True


class UserListResponse(BaseModel):
    users: list[User]
    total: int
