from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Any, Optional, Literal, Dict

Units = Literal["deg","score","prob","label","none","json"]
Origin = Literal["clinical_test","user_report","derived","natal_astro","timing_astro","hd","gene_keys","iching","numerology","bowen","jung","constellation"]
Epistemic = Literal["measured","inferred","symbolic"]
Stability = Literal["trait","state","context"]

class Provenance(BaseModel):
    method: str
    version: str
    inputs_hash: str

class FeatureEnvelope(BaseModel):
    feature_id: str
    value: Any
    units: Units
    timestamp: Optional[str] = None
    time_range: Optional[Dict[str,str]] = None
    origin: Origin
    epistemic_class: Epistemic
    confidence: float = Field(ge=0.0, le=1.0)
    stability: Stability
    half_life_days: float = Field(ge=0.0)
    provenance: Provenance
    notes: Optional[str] = None
