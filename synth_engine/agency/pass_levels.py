from enum import Enum

class PassLevel(str, Enum):
    PASSIVE = "PASSIVE"   # stabilize, explain-only
    GUIDED = "GUIDED"     # scripts, timing, read-aloud
    ACTIVE = "ACTIVE"     # allowlisted actions + tools
