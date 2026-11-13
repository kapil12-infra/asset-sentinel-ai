import asyncio
import socket

import pytest
from fastapi import HTTPException

import app as runner


@pytest.fixture(autouse=True)
def configure_runner(monkeypatch):
    monkeypatch.setattr(runner, "ALLOWED_HOSTS", {"qa.example.com"})
    monkeypatch.setattr(runner, "RUNNER_TOKEN", "test-runner-token")
    monkeypatch.setattr(runner, "PROXY_SERVER", "http://egress-proxy:3128")
    monkeypatch.setattr(runner, "PROXY_USERNAME", "test-user")
    monkeypatch.setattr(runner, "PROXY_PASSWORD", "test-password")


def public_dns(*args, **kwargs):
    return [
        (
            socket.AF_INET,
            socket.SOCK_STREAM,
            6,
            "",
            ("93.184.216.34", 443),
        )
    ]


def test_valid_allowlisted_https_target(monkeypatch):
    monkeypatch.setattr(runner.socket, "getaddrinfo", public_dns)

    parsed, host = runner.validate_target("https://qa.example.com/login")

    assert parsed.scheme == "https"
    assert host == "qa.example.com"


@pytest.mark.parametrize(
    "url",
    [
        "http://qa.example.com",
        "https://evil.example.com",
        "https://sub.qa.example.com",
        "https://qa.example.com:444",
        "https://user:pass@qa.example.com",
        "https://127.0.0.1",
    ],
)
def test_rejects_invalid_or_out_of_scope_targets(monkeypatch, url):
    monkeypatch.setattr(runner.socket, "getaddrinfo", public_dns)

    with pytest.raises(HTTPException) as exc:
        runner.validate_target(url)

    assert exc.value.status_code == 400


def test_rejects_private_dns_result(monkeypatch):
    def private_dns(*args, **kwargs):
        return [
            (
                socket.AF_INET,
                socket.SOCK_STREAM,
                6,
                "",
                ("127.0.0.1", 443),
            )
        ]

    monkeypatch.setattr(runner.socket, "getaddrinfo", private_dns)

    with pytest.raises(HTTPException) as exc:
        runner.validate_target("https://qa.example.com")

    assert exc.value.status_code == 400


def test_rejects_mixed_public_and_private_dns(monkeypatch):
    def mixed_dns(*args, **kwargs):
        return public_dns() + [
            (
                socket.AF_INET,
                socket.SOCK_STREAM,
                6,
                "",
                ("10.0.0.10", 443),
            )
        ]

    monkeypatch.setattr(runner.socket, "getaddrinfo", mixed_dns)

    with pytest.raises(HTTPException):
        runner.validate_target("https://qa.example.com")


def test_proxy_requires_credentials(monkeypatch):
    monkeypatch.setattr(runner, "PROXY_PASSWORD", "")

    with pytest.raises(HTTPException) as exc:
        runner.get_proxy()

    assert exc.value.status_code == 503


def test_proxy_accepts_expected_internal_endpoint():
    proxy = runner.get_proxy()

    assert proxy["server"] == "http://egress-proxy:3128"
    assert proxy["username"] == "test-user"


def test_runner_rejects_invalid_token():
    request = runner.RunRequest(
        target_url="https://qa.example.com",
        authorization_confirmed=True,
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(runner.run_tests(request, "wrong-token"))

    assert exc.value.status_code == 401


def test_runner_requires_explicit_authorization():
    request = runner.RunRequest(
        target_url="https://qa.example.com",
        authorization_confirmed=False,
    )

    with pytest.raises(HTTPException) as exc:
        asyncio.run(runner.run_tests(request, "test-runner-token"))

    assert exc.value.status_code == 403
