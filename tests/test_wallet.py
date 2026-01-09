from synth_engine.config import settings
from synth_engine.wallet.passkit import make_fingerprint, hash_wallet_token, verify_wallet_token


def test_wallet_fingerprint_stable():
    settings.wallet_fingerprint_salt = "test-salt"
    first = make_fingerprint("user-123")
    second = make_fingerprint("user-123")
    third = make_fingerprint("user-456")
    assert first == second
    assert first != third


def test_wallet_token_hashing():
    settings.wallet_daily_token_secret = "token-secret"
    token = "sample-token"
    token_hash = hash_wallet_token(token)
    assert verify_wallet_token(token, token_hash)
    assert not verify_wallet_token("bad-token", token_hash)
