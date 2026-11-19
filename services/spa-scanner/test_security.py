import os
import importlib
import pytest
from fastapi import HTTPException


@pytest.fixture
def scanner(monkeypatch):
    monkeypatch.setenv("SCANNER_TOKEN", "test-token")
    monkeypatch.setenv("SCANNER_ALLOWED_HOSTS", "example.com")

    import app
    importlib.reload(app)

    def public_dns(host, port, type):
        return [
            (2, 1, 6, "", ("93.184.216.34", port))
        ]

    monkeypatch.setattr(app.socket, "getaddrinfo", public_dns)
    return app


def test_accepts_allowlisted_https(scanner):
    parsed, host = scanner.validate_url(
        "https://example.com/"
    )
    assert parsed.scheme == "https"
    assert host == "example.com"


@pytest.mark.parametrize("url", [
    "http://example.com",
    "https://example.com:8443",
    "https://user:pass@example.com",
    "https://evil.example",
])
def test_rejects_invalid_targets(scanner, url):
    with pytest.raises(HTTPException):
        scanner.validate_url(url)


def test_rejects_private_ip(scanner, monkeypatch):
    monkeypatch.setattr(
        scanner.socket,
        "getaddrinfo",
        lambda *args, **kwargs: [
            (2, 1, 6, "", ("127.0.0.1", 443))
        ],
    )

    with pytest.raises(HTTPException):
        scanner.validate_url("https://example.com")



def test_scan_scope_accepts_expected_host(scanner):
    parsed, host = scanner.validate_scan_scope(
        "https://example.com/dashboard",
        "example.com",
    )
    assert parsed.path == "/dashboard"
    assert host == "example.com"


def test_scan_scope_rejects_redirect_to_other_host(scanner):
    with pytest.raises(HTTPException):
        scanner.validate_scan_scope(
            "https://evil.example/",
            "example.com",
        )

def test_rejects_missing_allowlist(monkeypatch):
    monkeypatch.setenv("SCANNER_ALLOWED_HOSTS", "")

    import app
    importlib.reload(app)

    with pytest.raises(HTTPException):
        app.validate_url("https://example.com")


def test_rejects_missing_token(scanner):
    from fastapi.testclient import TestClient

    client = TestClient(scanner.app)
    response = client.post(
        "/scan",
        json={
            "target_url": "https://example.com",
            "authorization_confirmed": True,
        },
    )
    assert response.status_code == 401


def test_rejects_missing_authorization(scanner):
    from fastapi.testclient import TestClient

    client = TestClient(scanner.app)
    response = client.post(
        "/scan",
        headers={"X-Scanner-Token": "test-token"},
        json={"target_url": "https://example.com"},
    )
    assert response.status_code == 403


def test_rejects_mixed_public_and_private_dns(scanner, monkeypatch):
    monkeypatch.setattr(
        scanner.socket,
        "getaddrinfo",
        lambda *args, **kwargs: [
            (2, 1, 6, "", ("93.184.216.34", 443)),
            (2, 1, 6, "", ("10.0.0.10", 443)),
        ],
    )

    with pytest.raises(HTTPException):
        scanner.validate_url("https://example.com")


@pytest.mark.parametrize("address", [
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
])
def test_rejects_non_public_ipv6_dns(scanner, monkeypatch, address):
    monkeypatch.setattr(
        scanner.socket,
        "getaddrinfo",
        lambda *args, **kwargs: [
            (10, 1, 6, "", (address, 443, 0, 0))
        ],
    )

    with pytest.raises(HTTPException):
        scanner.validate_url("https://example.com")


def test_rejects_empty_dns_response(scanner, monkeypatch):
    monkeypatch.setattr(
        scanner.socket,
        "getaddrinfo",
        lambda *args, **kwargs: [],
    )

    with pytest.raises(HTTPException):
        scanner.validate_url("https://example.com")


def test_proxy_requires_all_credentials(scanner, monkeypatch):
    monkeypatch.setattr(scanner, "SCANNER_PROXY_SERVER",
                        "http://egress-proxy:3128")
    monkeypatch.setattr(scanner, "SCANNER_PROXY_USERNAME", "test-user")
    monkeypatch.setattr(scanner, "SCANNER_PROXY_PASSWORD", "")

    with pytest.raises(HTTPException) as exc:
        scanner.get_browser_proxy()

    assert exc.value.status_code == 503


def test_proxy_rejects_unapproved_address(scanner, monkeypatch):
    monkeypatch.setattr(scanner, "SCANNER_PROXY_SERVER",
                        "http://127.0.0.1:3128")
    monkeypatch.setattr(scanner, "SCANNER_PROXY_USERNAME", "test-user")
    monkeypatch.setattr(scanner, "SCANNER_PROXY_PASSWORD", "test-pass")

    with pytest.raises(HTTPException) as exc:
        scanner.get_browser_proxy()

    assert exc.value.status_code == 503


def test_proxy_accepts_expected_configuration(scanner, monkeypatch):
    monkeypatch.setattr(scanner, "SCANNER_PROXY_SERVER",
                        "http://egress-proxy:3128")
    monkeypatch.setattr(scanner, "SCANNER_PROXY_USERNAME", "test-user")
    monkeypatch.setattr(scanner, "SCANNER_PROXY_PASSWORD", "test-pass")

    result = scanner.get_browser_proxy()

    assert result == {
        "server": "http://egress-proxy:3128",
        "username": "test-user",
        "password": "test-pass",
    }
