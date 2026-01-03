from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict

TimePrecision = Literal["exact","pm15","pm60","unknown"]

class Location(BaseModel):
    lat: float
    lon: float

class BirthData(BaseModel):
    date: str
    time: Optional[str] = None
    time_precision: TimePrecision = "unknown"
    location: Location
    birth_timezone: str = "UTC"  # IMPORTANT: store at input time

class ClinicalBig5(BaseModel):
    O: float = Field(ge=0.0, le=1.0)
    C: float = Field(ge=0.0, le=1.0)
    E: float = Field(ge=0.0, le=1.0)
    A: float = Field(ge=0.0, le=1.0)
    N: float = Field(ge=0.0, le=1.0)
    timestamp: str

class ClinicalAttachment(BaseModel):
    anxiety: float = Field(ge=0.0, le=1.0)
    avoidance: float = Field(ge=0.0, le=1.0)
    timestamp: str

class ClinicalBlock(BaseModel):
    big5: Optional[ClinicalBig5] = None
    attachment: Optional[ClinicalAttachment] = None

class Preferences(BaseModel):
    symbolic_overlay: bool = True
    astrology_timing_enabled: bool = True
    iching_consult_enabled: bool = False
    bowen_enabled: bool = True
    jung_enabled: bool = True

class PersonInput(BaseModel):
    person_id: str
    timezone: str = "UTC"  # viewing timezone
    birth: BirthData
    name_at_birth: Optional[str] = None
    clinical: ClinicalBlock = ClinicalBlock()
    preferences: Preferences = Preferences()
    # state check-ins or inferred context can be passed here per compute run
    user_report: Optional[Dict[str, float]] = None
