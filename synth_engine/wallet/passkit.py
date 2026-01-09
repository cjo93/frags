from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import math
import secrets
import struct
import zlib
from typing import Dict, Tuple
from zipfile import ZipFile, ZIP_DEFLATED

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization import pkcs12, pkcs7

from synth_engine.compute.astrology import compute_natal
from synth_engine.config import settings
from synth_engine.schemas.person import PersonInput
from synth_engine.utils.timeutils import localize_birth
from synth_engine.wallet.storage import get_mandala_png, put_mandala_png


def make_fingerprint(user_id: str) -> str:
    if not settings.wallet_fingerprint_salt:
        raise ValueError("wallet_fingerprint_salt missing")
    payload = f"{user_id}:{settings.wallet_fingerprint_salt}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()[:16]


def new_wallet_token() -> str:
    return secrets.token_urlsafe(32)


def hash_wallet_token(token: str) -> str:
    if not settings.wallet_daily_token_secret:
        raise ValueError("wallet_daily_token_secret missing")
    return hmac.new(
        settings.wallet_daily_token_secret.encode("utf-8"),
        token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_wallet_token(token: str, expected_hash: str) -> bool:
    try:
        token_hash = hash_wallet_token(token)
    except ValueError:
        return False
    return hmac.compare_digest(token_hash, expected_hash)


def _mandala_seed(user_id: str, person: PersonInput) -> bytes:
    birth = person.birth
    birth_time = birth.time or "12:00:00"
    seed_src = (
        f"{user_id}:{birth.date}:{birth_time}:{birth.location.lat}:{birth.location.lon}:defrag-mandala-v1"
    )
    return hashlib.sha256(seed_src.encode("utf-8")).digest()


def _palette(seed: bytes) -> Tuple[Tuple[int, int, int], Tuple[int, int, int], Tuple[int, int, int]]:
    base = (20 + seed[0] % 60, 20 + seed[1] % 60, 20 + seed[2] % 60)
    accent = (120 + seed[3] % 80, 80 + seed[4] % 80, 60 + seed[5] % 80)
    line = (90 + seed[6] % 80, 90 + seed[7] % 80, 90 + seed[8] % 80)
    return base, accent, line


def _encode_png(width: int, height: int, rgba: bytes) -> bytes:
    stride = width * 4
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        raw.extend(rgba[y * stride:(y + 1) * stride])
    compressed = zlib.compress(bytes(raw), level=9)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return b"".join([
        b"\x89PNG\r\n\x1a\n",
        chunk(b"IHDR", header),
        chunk(b"IDAT", compressed),
        chunk(b"IEND", b""),
    ])


def _solid_png(size: int, color: Tuple[int, int, int]) -> bytes:
    width = height = size
    rgba = bytearray(width * height * 4)
    for i in range(width * height):
        idx = i * 4
        rgba[idx] = color[0]
        rgba[idx + 1] = color[1]
        rgba[idx + 2] = color[2]
        rgba[idx + 3] = 255
    return _encode_png(width, height, bytes(rgba))


def _blend_pixel(rgba: bytearray, idx: int, color: Tuple[int, int, int], alpha: float) -> None:
    inv = 1.0 - alpha
    rgba[idx] = int(rgba[idx] * inv + color[0] * alpha)
    rgba[idx + 1] = int(rgba[idx + 1] * inv + color[1] * alpha)
    rgba[idx + 2] = int(rgba[idx + 2] * inv + color[2] * alpha)
    rgba[idx + 3] = 255


def _draw_line(
    rgba: bytearray,
    width: int,
    height: int,
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    color: Tuple[int, int, int],
    thickness: int,
    alpha: float,
) -> None:
    steps = int(max(abs(x2 - x1), abs(y2 - y1))) or 1
    for i in range(steps + 1):
        t = i / steps
        x = int(round(x1 + (x2 - x1) * t))
        y = int(round(y1 + (y2 - y1) * t))
        for dx in range(-thickness, thickness + 1):
            for dy in range(-thickness, thickness + 1):
                px = x + dx
                py = y + dy
                if 0 <= px < width and 0 <= py < height:
                    idx = (py * width + px) * 4
                    _blend_pixel(rgba, idx, color, alpha)


def render_mandala_png(user_id: str, person: PersonInput) -> bytes:
    seed = _mandala_seed(user_id, person)
    base_color, accent_color, line_color = _palette(seed)

    birth = person.birth
    birth_time = birth.time or "12:00:00"
    dt_utc = localize_birth(birth.date, birth_time, birth.birth_timezone)
    natal = compute_natal(dt_utc, birth.location.lat, birth.location.lon)

    counts = [0] * 12
    for data in natal["planets"].values():
        sector = int(data["lon"] // 30) % 12
        counts[sector] += 1
    max_count = max(counts) or 1

    width = height = 256
    rgba = bytearray(width * height * 4)
    bg = (245, 244, 242)
    for i in range(width * height):
        idx = i * 4
        rgba[idx] = bg[0]
        rgba[idx + 1] = bg[1]
        rgba[idx + 2] = bg[2]
        rgba[idx + 3] = 255

    cx = cy = width // 2
    inner = 70
    outer = 108
    outer_line = 112
    for y in range(height):
        for x in range(width):
            dx = x - cx
            dy = y - cy
            r = math.hypot(dx, dy)
            if inner <= r <= outer:
                angle = (math.atan2(dy, dx) + 2 * math.pi) % (2 * math.pi)
                sector = int(angle / (2 * math.pi / 12))
                intensity = counts[sector] / max_count
                color = (
                    int(base_color[0] + (accent_color[0] - base_color[0]) * intensity),
                    int(base_color[1] + (accent_color[1] - base_color[1]) * intensity),
                    int(base_color[2] + (accent_color[2] - base_color[2]) * intensity),
                )
                idx = (y * width + x) * 4
                rgba[idx] = color[0]
                rgba[idx + 1] = color[1]
                rgba[idx + 2] = color[2]
                rgba[idx + 3] = 255
            elif outer <= r <= outer_line:
                idx = (y * width + x) * 4
                rgba[idx] = line_color[0]
                rgba[idx + 1] = line_color[1]
                rgba[idx + 2] = line_color[2]
                rgba[idx + 3] = 255

    obj_lons = {**{k: v["lon"] for k, v in natal["planets"].items()}, **natal["angles"]}
    for aspect in natal["aspects"][:120]:
        a = aspect["a"]
        b = aspect["b"]
        if a not in obj_lons or b not in obj_lons:
            continue
        orb = float(aspect.get("orb", 0.0))
        if orb <= 1.0:
            thickness = 2
            alpha = 0.6
        elif orb <= 2.0:
            thickness = 1
            alpha = 0.45
        else:
            thickness = 1
            alpha = 0.3
        ang_a = math.radians(obj_lons[a] - 90.0)
        ang_b = math.radians(obj_lons[b] - 90.0)
        r = 60
        x1 = cx + math.cos(ang_a) * r
        y1 = cy + math.sin(ang_a) * r
        x2 = cx + math.cos(ang_b) * r
        y2 = cy + math.sin(ang_b) * r
        _draw_line(rgba, width, height, x1, y1, x2, y2, line_color, thickness, alpha)

    return _encode_png(width, height, bytes(rgba))


def load_or_create_mandala_png(user_id: str, profile_id: str, person: PersonInput) -> bytes:
    cached = get_mandala_png(profile_id)
    if cached:
        return cached
    png_bytes = render_mandala_png(user_id, person)
    put_mandala_png(profile_id, png_bytes)
    return png_bytes


def _load_signing_material() -> Tuple[object, x509.Certificate, x509.Certificate]:
    if not settings.apple_pass_cert_p12_b64:
        raise ValueError("APPLE_PASS_CERT_P12_B64 missing")
    if not settings.apple_wwdr_cert_pem_b64:
        raise ValueError("APPLE_WWDR_CERT_PEM_B64 missing")

    p12 = base64.b64decode(settings.apple_pass_cert_p12_b64)
    password = settings.apple_pass_cert_password.encode("utf-8") if settings.apple_pass_cert_password else None
    key, cert, _ = pkcs12.load_key_and_certificates(p12, password=password)
    if key is None or cert is None:
        raise ValueError("Pass signing certificate missing")

    wwdr_pem = base64.b64decode(settings.apple_wwdr_cert_pem_b64)
    wwdr_cert = x509.load_pem_x509_certificate(wwdr_pem)
    return key, cert, wwdr_cert


def _sign_manifest(manifest_bytes: bytes) -> bytes:
    key, cert, wwdr_cert = _load_signing_material()
    builder = pkcs7.PKCS7SignatureBuilder().set_data(manifest_bytes).add_signer(cert, key, hashes.SHA256())
    builder = builder.add_certificate(wwdr_cert)
    return builder.sign(
        serialization.Encoding.DER,
        [pkcs7.PKCS7Options.DetachedSignature, pkcs7.PKCS7Options.Binary],
    )


def build_pass_json(
    pass_serial: str,
    fingerprint: str,
    auth_token: str,
    barcode_message: str,
) -> Dict[str, object]:
    if not settings.apple_pass_type_id or not settings.apple_team_id:
        raise ValueError("Apple Pass identifiers are not configured")
    return {
        "formatVersion": 1,
        "passTypeIdentifier": settings.apple_pass_type_id,
        "serialNumber": pass_serial,
        "teamIdentifier": settings.apple_team_id,
        "organizationName": settings.apple_org_name or "Defrag",
        "description": "Defrag Mandala Card",
        "logoText": "Defrag",
        "foregroundColor": "rgb(20,20,20)",
        "backgroundColor": "rgb(245,244,242)",
        "labelColor": "rgb(90,90,90)",
        "authenticationToken": auth_token,
        "webServiceURL": f"{settings.api_base_url}/wallet",
        "barcode": {
            "format": "PKBarcodeFormatQR",
            "message": barcode_message,
            "messageEncoding": "iso-8859-1",
        },
        "generic": {
            "primaryFields": [
                {
                    "key": "title",
                    "label": "Mandala Card",
                    "value": "Defrag",
                }
            ],
            "secondaryFields": [
                {
                    "key": "fingerprint",
                    "label": "Fingerprint",
                    "value": fingerprint,
                }
            ],
        },
    }


def build_pkpass(pass_json: Dict[str, object], assets: Dict[str, bytes]) -> bytes:
    files = {
        "pass.json": json.dumps(pass_json, separators=(",", ":"), sort_keys=True).encode("utf-8"),
    }
    files.update(assets)

    manifest = {name: hashlib.sha1(data).hexdigest() for name, data in files.items()}
    manifest_bytes = json.dumps(manifest, separators=(",", ":"), sort_keys=True).encode("utf-8")
    signature = _sign_manifest(manifest_bytes)

    buf = io.BytesIO()
    with ZipFile(buf, "w", ZIP_DEFLATED) as zf:
        for name, data in files.items():
            zf.writestr(name, data)
        zf.writestr("manifest.json", manifest_bytes)
        zf.writestr("signature", signature)
    return buf.getvalue()


def build_default_assets(mandala_png: bytes) -> Dict[str, bytes]:
    icon = _solid_png(120, (30, 30, 30))
    logo = _solid_png(200, (50, 50, 50))
    return {
        "icon.png": icon,
        "logo.png": logo,
        "thumbnail.png": mandala_png,
    }
