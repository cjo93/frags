from __future__ import annotations

import os
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from synth_engine.config import settings


def _r2_client():
    if not (
        settings.wallet_r2_account_id
        and settings.wallet_r2_access_key_id
        and settings.wallet_r2_secret_access_key
        and settings.wallet_r2_bucket
    ):
        return None
    endpoint = f"https://{settings.wallet_r2_account_id}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.wallet_r2_access_key_id,
        aws_secret_access_key=settings.wallet_r2_secret_access_key,
        region_name="auto",
    )


def _mandala_key(profile_id: str) -> str:
    return f"wallet/mandala/{profile_id}.png"


def _local_path(profile_id: str) -> str:
    return os.path.join(settings.wallet_assets_dir, f"{profile_id}.png")


def get_mandala_png(profile_id: str) -> Optional[bytes]:
    client = _r2_client()
    key = _mandala_key(profile_id)
    if client:
        try:
            obj = client.get_object(Bucket=settings.wallet_r2_bucket, Key=key)
            return obj["Body"].read()
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in {"NoSuchKey", "404", "NotFound"}:
                pass
            else:
                raise
    path = _local_path(profile_id)
    if os.path.exists(path):
        with open(path, "rb") as handle:
            return handle.read()
    return None


def put_mandala_png(profile_id: str, png_bytes: bytes) -> None:
    os.makedirs(settings.wallet_assets_dir, exist_ok=True)
    path = _local_path(profile_id)
    with open(path, "wb") as handle:
        handle.write(png_bytes)

    client = _r2_client()
    if not client:
        return
    key = _mandala_key(profile_id)
    client.put_object(
        Bucket=settings.wallet_r2_bucket,
        Key=key,
        Body=png_bytes,
        ContentType="image/png",
        CacheControl="private, max-age=86400",
    )
