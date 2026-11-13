import importlib
import socket

import pytest


@pytest.fixture
def proxy(monkeypatch):
    monkeypatch.setenv("PROXY_ALLOWED_HOSTS", "example.com")
    monkeypatch.setenv("PROXY_USERNAME", "scanner")
    monkeypatch.setenv("PROXY_PASSWORD", "test-password")

    import proxy
    importlib.reload(proxy)
    return proxy


def test_accepts_exact_allowlisted_host(proxy):
    assert proxy.validate_authority("example.com:443") == "example.com"


@pytest.mark.parametrize("authority", [
    "evil.example:443",
    "example.com:8443",
    "example.com:80",
    "127.0.0.1:443",
    "localhost:443",
    "user@example.com:443",
    "example.com:443/path",
])
def test_rejects_invalid_authority(proxy, authority):
    with pytest.raises(ValueError):
        proxy.validate_authority(authority)


def test_rejects_private_dns(proxy, monkeypatch):
    monkeypatch.setattr(
        proxy.socket,
        "getaddrinfo",
        lambda *args, **kwargs: [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "",
             ("127.0.0.1", 443))
        ],
    )

    with pytest.raises(ValueError):
        proxy.resolve_public_addresses("example.com")


def test_rejects_mixed_public_private_dns(proxy, monkeypatch):
    monkeypatch.setattr(
        proxy.socket,
        "getaddrinfo",
        lambda *args, **kwargs: [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "",
             ("93.184.216.34", 443)),
            (socket.AF_INET, socket.SOCK_STREAM, 6, "",
             ("10.0.0.10", 443)),
        ],
    )

    with pytest.raises(ValueError):
        proxy.resolve_public_addresses("example.com")


def test_returns_validated_public_ip(proxy, monkeypatch):
    monkeypatch.setattr(
        proxy.socket,
        "getaddrinfo",
        lambda *args, **kwargs: [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "",
             ("93.184.216.34", 443))
        ],
    )

    assert proxy.resolve_public_addresses("example.com") == [
        "93.184.216.34"
    ]


def test_proxy_authentication(proxy):
    import base64

    encoded = base64.b64encode(
        b"scanner:test-password"
    ).decode()

    assert proxy.valid_proxy_auth(f"Basic {encoded}")
    assert not proxy.valid_proxy_auth("Basic invalid")


def test_proxy_resource_limits(proxy):
    assert proxy.MAX_CONCURRENT_CONNECTIONS == 10
    assert proxy.MAX_TUNNEL_SECONDS == 180
    assert proxy.MAX_TUNNEL_BYTES == 50 * 1024 * 1024


def test_pump_rejects_data_over_limit(proxy, monkeypatch):
    import asyncio

    class FakeReader:
        async def read(self, size):
            return b"12345"

    class FakeWriter:
        def __init__(self):
            self.closed = False

        def close(self):
            self.closed = True

        def write(self, data):
            pass

        async def drain(self):
            pass

    monkeypatch.setattr(proxy, "MAX_TUNNEL_BYTES", 4)

    writer = FakeWriter()

    async def run_test():
        with pytest.raises(proxy.TunnelLimitExceeded):
            await proxy.pump(FakeReader(), writer)

    asyncio.run(run_test())

    assert writer.closed


def build_client_hello(hostname="example.com", include_sni=True):
    """Build a minimal TLS 1.2-style ClientHello for parser tests."""
    import struct

    extensions = b""

    if include_sni:
        name = hostname.encode("ascii")
        server_name = (
            b"\x00"
            + struct.pack("!H", len(name))
            + name
        )
        sni_data = struct.pack("!H", len(server_name)) + server_name
        extensions += (
            b"\x00\x00"
            + struct.pack("!H", len(sni_data))
            + sni_data
        )

    body = (
        b"\x03\x03"
        + b"\x11" * 32
        + b"\x00"
        + b"\x00\x02\x13\x01"
        + b"\x01\x00"
        + struct.pack("!H", len(extensions))
        + extensions
    )

    handshake = b"\x01" + len(body).to_bytes(3, "big") + body

    return (
        b"\x16\x03\x01"
        + len(handshake).to_bytes(2, "big")
        + handshake
    )


def test_extracts_valid_tls_sni(proxy):
    hello = build_client_hello("example.com")
    assert proxy.extract_tls_sni(hello) == "example.com"


def test_normalizes_tls_sni(proxy):
    hello = build_client_hello("EXAMPLE.COM")
    assert proxy.extract_tls_sni(hello) == "example.com"


def test_rejects_missing_sni(proxy):
    hello = build_client_hello(include_sni=False)

    with pytest.raises(ValueError, match="no hostname SNI"):
        proxy.extract_tls_sni(hello)


def test_rejects_non_handshake_record(proxy):
    with pytest.raises(ValueError, match="Expected TLS handshake"):
        proxy.extract_tls_sni(b"\x17\x03\x03\x00\x01\x00")


def test_rejects_oversized_client_hello(proxy):
    with pytest.raises(ValueError, match="exceeds size limit"):
        proxy.extract_tls_sni(
            b"\x16" * (proxy.MAX_CLIENT_HELLO_BYTES + 1)
        )


def test_accepts_client_hello_split_across_tls_records(proxy):
    hello = build_client_hello("example.com")
    handshake = hello[5:]

    split_at = 12
    first = handshake[:split_at]
    second = handshake[split_at:]

    record_one = (
        b"\x16\x03\x03"
        + len(first).to_bytes(2, "big")
        + first
    )
    record_two = (
        b"\x16\x03\x03"
        + len(second).to_bytes(2, "big")
        + second
    )

    assert proxy.extract_tls_sni(
        record_one + record_two
    ) == "example.com"


def test_read_client_hello_handles_tcp_fragmentation(proxy):
    import asyncio

    hello = build_client_hello("example.com")

    async def run_test():
        reader = asyncio.StreamReader()

        # Simulate the TLS handshake arriving in separate TCP chunks.
        for chunk in (hello[:2], hello[2:7], hello[7:15], hello[15:]):
            reader.feed_data(chunk)

        reader.feed_eof()

        raw, hostname = await proxy.read_client_hello(reader)

        assert raw == hello
        assert hostname == "example.com"

    asyncio.run(run_test())


def test_read_client_hello_preserves_fragmented_tls_records(proxy):
    import asyncio

    hello = build_client_hello("example.com")
    handshake = hello[5:]

    split_at = 12

    records = (
        b"\x16\x03\x03"
        + len(handshake[:split_at]).to_bytes(2, "big")
        + handshake[:split_at]
        + b"\x16\x03\x03"
        + len(handshake[split_at:]).to_bytes(2, "big")
        + handshake[split_at:]
    )

    async def run_test():
        reader = asyncio.StreamReader()
        reader.feed_data(records)
        reader.feed_eof()

        raw, hostname = await proxy.read_client_hello(reader)

        assert raw == records
        assert hostname == "example.com"

    asyncio.run(run_test())


def test_read_client_hello_rejects_non_tls_input(proxy):
    import asyncio

    async def run_test():
        reader = asyncio.StreamReader()
        reader.feed_data(b"NOTTLS")
        reader.feed_eof()

        with pytest.raises(ValueError, match="Expected TLS handshake"):
            await proxy.read_client_hello(reader)

    asyncio.run(run_test())


def test_read_client_hello_rejects_incomplete_record(proxy):
    import asyncio

    async def run_test():
        reader = asyncio.StreamReader()
        reader.feed_data(b"\x16\x03\x03\x00\x10short")
        reader.feed_eof()

        with pytest.raises(asyncio.IncompleteReadError):
            await proxy.read_client_hello(reader)

    asyncio.run(run_test())


class FakeProxyReader:
    def __init__(self, hello, client_writer):
        self.hello = hello
        self.client_writer = client_writer
        self.hello_read = False

    async def readuntil(self, separator):
        return (
            b"CONNECT example.com:443 HTTP/1.1\r\n"
            b"Host: example.com:443\r\n"
            b"Proxy-Authorization: Basic c2Nhbm5lcjp0ZXN0LXBhc3N3b3Jk\r\n"
            b"\r\n"
        )

    async def readexactly(self, size):
        assert b"HTTP/1.1 200 Connection Established\r\n\r\n" in (
            b"".join(self.client_writer.data)
        ), "Proxy must send HTTP 200 before reading ClientHello"

        self.hello_read = True

        if len(self.hello) < size:
            raise AssertionError("Not enough ClientHello bytes")

        result = self.hello[:size]
        self.hello = self.hello[size:]
        return result

    async def read(self, size):
        return b""


class FakeProxyWriter:
    def __init__(self):
        self.data = []
        self.closed = False

    def write(self, data):
        self.data.append(data)

    async def drain(self):
        pass

    def close(self):
        self.closed = True

    def is_closing(self):
        return self.closed

    async def wait_closed(self):
        pass


@pytest.mark.parametrize(
    "sni, expected_forwarded",
    [
        ("example.com", True),
        ("attacker.example", False),
    ],
)
def test_handle_client_enforces_sni_after_connect(
    proxy, monkeypatch, sni, expected_forwarded
):
    import asyncio

    client_writer = FakeProxyWriter()
    upstream_writer = FakeProxyWriter()
    upstream_reader = FakeProxyReader(b"", client_writer)

    hello = build_client_hello(sni)
    client_reader = FakeProxyReader(hello, client_writer)

    monkeypatch.setattr(
        proxy,
        "resolve_public_addresses",
        lambda host: ["93.184.216.34"],
    )

    async def fake_open_connection(host, port):
        assert host == "93.184.216.34"
        assert port == 443
        return upstream_reader, upstream_writer

    monkeypatch.setattr(
        proxy.asyncio,
        "open_connection",
        fake_open_connection,
    )

    asyncio.run(
        proxy.handle_client(client_reader, client_writer)
    )

    response = b"".join(client_writer.data)

    assert (
        b"HTTP/1.1 200 Connection Established\r\n\r\n"
        in response
    )

    if expected_forwarded:
        assert b"".join(upstream_writer.data) == hello
    else:
        assert b"".join(upstream_writer.data) == b""
        assert client_writer.closed

        # No second HTTP error response after CONNECT succeeded.
        assert response.count(b"HTTP/1.1") == 1
