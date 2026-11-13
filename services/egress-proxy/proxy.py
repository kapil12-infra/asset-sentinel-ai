import asyncio
import base64
import ipaddress
import os
import re
import socket

MAX_HEADER = 16384
CONNECT_TIMEOUT = 10
TUNNEL_IDLE_TIMEOUT = 120

MAX_CONCURRENT_CONNECTIONS = 10
MAX_TUNNEL_SECONDS = 180
MAX_TUNNEL_BYTES = 50 * 1024 * 1024

CONNECTION_SEMAPHORE = asyncio.Semaphore(
    MAX_CONCURRENT_CONNECTIONS
)


class TunnelLimitExceeded(Exception):
    """Raised when a tunnel exceeds its permitted data transfer."""

ALLOWED_HOSTS = {
    item.strip().lower().rstrip(".")
    for item in os.environ.get("PROXY_ALLOWED_HOSTS", "").split(",")
    if item.strip()
}

PROXY_USERNAME = os.environ.get("PROXY_USERNAME", "")
PROXY_PASSWORD = os.environ.get("PROXY_PASSWORD", "")


def normalize_host(host: str) -> str:
    host = host.rstrip(".").lower()
    return host.encode("idna").decode("ascii")



MAX_CLIENT_HELLO_BYTES = 16384
MAX_TLS_RECORD_BYTES = 18432


def extract_tls_sni(data: bytes) -> str:
    """Extract and normalize SNI from a complete TLS ClientHello."""

    if len(data) > MAX_CLIENT_HELLO_BYTES:
        raise ValueError("TLS ClientHello exceeds size limit")

    offset = 0
    handshake = bytearray()

    while offset + 5 <= len(data):
        content_type = data[offset]
        record_version = data[offset + 1:offset + 3]
        record_length = int.from_bytes(data[offset + 3:offset + 5], "big")

        if content_type != 22:
            raise ValueError("Expected TLS handshake record")

        if record_version[0] != 3 or record_length == 0:
            raise ValueError("Invalid TLS record")

        if record_length > MAX_TLS_RECORD_BYTES:
            raise ValueError("TLS record exceeds size limit")

        end = offset + 5 + record_length
        if end > len(data):
            raise ValueError("Incomplete TLS record")

        handshake.extend(data[offset + 5:end])
        offset = end

        if len(handshake) >= 4:
            if handshake[0] != 1:
                raise ValueError("Expected TLS ClientHello")

            hello_length = int.from_bytes(handshake[1:4], "big")
            if hello_length > MAX_CLIENT_HELLO_BYTES - 4:
                raise ValueError("TLS ClientHello exceeds size limit")

            if len(handshake) >= hello_length + 4:
                break

    if len(handshake) < 4:
        raise ValueError("Incomplete TLS handshake")

    hello_length = int.from_bytes(handshake[1:4], "big")
    if len(handshake) < hello_length + 4:
        raise ValueError("Incomplete TLS ClientHello")

    hello = memoryview(handshake)[4:4 + hello_length]
    pos = 0

    # legacy_version + random
    if len(hello) < 34:
        raise ValueError("Malformed ClientHello")
    pos = 34

    # session ID
    if pos >= len(hello):
        raise ValueError("Missing session ID")
    session_length = hello[pos]
    pos += 1
    pos += session_length

    # cipher suites
    if pos + 2 > len(hello):
        raise ValueError("Missing cipher suites")
    cipher_length = int.from_bytes(hello[pos:pos + 2], "big")
    pos += 2 + cipher_length

    # compression methods
    if pos >= len(hello):
        raise ValueError("Missing compression methods")
    compression_length = hello[pos]
    pos += 1 + compression_length

    # Extensions
    if pos == len(hello):
        raise ValueError("ClientHello has no SNI extension")

    if pos + 2 > len(hello):
        raise ValueError("Malformed extensions length")
    extensions_length = int.from_bytes(hello[pos:pos + 2], "big")
    pos += 2

    extensions_end = pos + extensions_length
    if extensions_end != len(hello):
        raise ValueError("Invalid extensions length")

    found_sni = None

    while pos < extensions_end:
        if pos + 4 > extensions_end:
            raise ValueError("Malformed TLS extension")

        extension_type = int.from_bytes(hello[pos:pos + 2], "big")
        extension_length = int.from_bytes(hello[pos + 2:pos + 4], "big")
        pos += 4

        extension_end = pos + extension_length
        if extension_end > extensions_end:
            raise ValueError("TLS extension exceeds ClientHello")

        if extension_type == 0:
            if found_sni is not None:
                raise ValueError("Duplicate SNI extension")

            extension = hello[pos:extension_end]
            if len(extension) < 5:
                raise ValueError("Malformed SNI extension")

            list_length = int.from_bytes(extension[0:2], "big")
            if list_length != len(extension) - 2:
                raise ValueError("Invalid SNI list length")

            cursor = 2
            while cursor < len(extension):
                if cursor + 3 > len(extension):
                    raise ValueError("Malformed SNI entry")

                name_type = extension[cursor]
                name_length = int.from_bytes(
                    extension[cursor + 1:cursor + 3], "big"
                )
                cursor += 3

                name_end = cursor + name_length
                if name_end > len(extension):
                    raise ValueError("SNI entry exceeds extension")

                if name_type == 0:
                    if found_sni is not None:
                        raise ValueError("Multiple host_name entries")

                    try:
                        raw_name = bytes(extension[cursor:name_end]).decode(
                            "ascii"
                        )
                        found_sni = normalize_host(raw_name)
                    except (UnicodeError, ValueError):
                        raise ValueError("Invalid SNI hostname")

                    if (
                        not found_sni
                        or len(found_sni) > 253
                        or any(not label for label in found_sni.split("."))
                    ):
                        raise ValueError("Invalid SNI hostname")

                cursor = name_end

        pos = extension_end

    if not found_sni:
        raise ValueError("TLS ClientHello has no hostname SNI")

    return found_sni


async def read_client_hello(reader):
    """Read a bounded TLS ClientHello and return original bytes and SNI."""
    raw_tls = bytearray()
    handshake = bytearray()

    max_records = 16

    for _ in range(max_records):
        header = await asyncio.wait_for(
            reader.readexactly(5),
            timeout=5,
        )

        content_type = header[0]
        major_version = header[1]
        record_length = int.from_bytes(header[3:5], "big")

        if content_type != 22:
            raise ValueError("Expected TLS handshake record")

        if major_version != 3:
            raise ValueError("Invalid TLS record version")

        if record_length == 0 or record_length > MAX_TLS_RECORD_BYTES:
            raise ValueError("Invalid TLS record length")

        payload = await asyncio.wait_for(
            reader.readexactly(record_length),
            timeout=5,
        )

        raw_tls.extend(header)
        raw_tls.extend(payload)
        handshake.extend(payload)

        if len(raw_tls) > MAX_CLIENT_HELLO_BYTES + (max_records * 5):
            raise ValueError("TLS input exceeds size limit")

        if len(handshake) >= 4:
            if handshake[0] != 1:
                raise ValueError("Expected TLS ClientHello")

            hello_length = int.from_bytes(handshake[1:4], "big")

            if hello_length > MAX_CLIENT_HELLO_BYTES - 4:
                raise ValueError("TLS ClientHello exceeds size limit")

            if len(handshake) >= hello_length + 4:
                original = bytes(raw_tls)
                sni_hostname = extract_tls_sni(original)

                return original, sni_hostname

        if len(handshake) > MAX_CLIENT_HELLO_BYTES:
            raise ValueError("TLS handshake exceeds size limit")

    raise ValueError("Too many TLS records before ClientHello completed")
def validate_authority(authority: str) -> str:
    if not authority or any(c in authority for c in "/\\@?#"):
        raise ValueError("Invalid CONNECT authority")

    match = re.fullmatch(r"([A-Za-z0-9.-]+):443", authority)
    if not match:
        raise ValueError("Only hostname:443 CONNECT is allowed")

    host = normalize_host(match.group(1))

    try:
        ipaddress.ip_address(host)
        raise ValueError("IP-literal targets are blocked")
    except ValueError as exc:
        if str(exc) == "IP-literal targets are blocked":
            raise

    if not ALLOWED_HOSTS or host not in ALLOWED_HOSTS:
        raise ValueError("Hostname is not allowlisted")

    return host


def resolve_public_addresses(host: str) -> list[str]:
    results = socket.getaddrinfo(
        host,
        443,
        family=socket.AF_UNSPEC,
        type=socket.SOCK_STREAM,
    )

    addresses = []
    for item in results:
        address = ipaddress.ip_address(item[4][0])

        if not address.is_global:
            raise ValueError("DNS returned a non-public address")

        value = str(address)
        if value not in addresses:
            addresses.append(value)

    if not addresses:
        raise ValueError("DNS returned no addresses")

    return addresses


def valid_proxy_auth(header: str) -> bool:
    if not PROXY_USERNAME or not PROXY_PASSWORD:
        return False

    if not header.startswith("Basic "):
        return False

    try:
        decoded = base64.b64decode(
            header[6:], validate=True
        ).decode("utf-8")

        username, password = decoded.split(":", 1)
        return (
            username == PROXY_USERNAME
            and password == PROXY_PASSWORD
        )
    except Exception:
        return False


async def send_error(writer, status: str):
    writer.write(
        f"HTTP/1.1 {status}\r\n"
        "Connection: close\r\n"
        "Content-Length: 0\r\n\r\n".encode()
    )
    await writer.drain()
    writer.close()
    try:
        await writer.wait_closed()
    except Exception:
        pass


async def pump(reader, writer):
    transferred = 0

    try:
        while True:
            data = await asyncio.wait_for(
                reader.read(65536),
                timeout=TUNNEL_IDLE_TIMEOUT,
            )

            if not data:
                break

            transferred += len(data)

            if transferred > MAX_TUNNEL_BYTES:
                raise TunnelLimitExceeded(
                    "Tunnel data transfer limit exceeded"
                )

            writer.write(data)
            await writer.drain()

    except (asyncio.TimeoutError, ConnectionError, OSError):
        pass
    finally:
        writer.close()


async def handle_client(reader, writer):
    upstream_reader = None
    upstream_writer = None
    tunnel_established = False

    try:
        raw = await asyncio.wait_for(
            reader.readuntil(b"\r\n\r\n"),
            timeout=5,
        )

        if len(raw) > MAX_HEADER:
            await send_error(writer, "431 Request Header Fields Too Large")
            return

        lines = raw.decode("iso-8859-1").split("\r\n")
        parts = lines[0].split()

        if len(parts) != 3 or parts[0] != "CONNECT":
            await send_error(writer, "405 Method Not Allowed")
            return

        host = validate_authority(parts[1])

        headers = {}
        for line in lines[1:]:
            if not line:
                continue
            if ":" not in line:
                raise ValueError("Malformed proxy header")
            key, value = line.split(":", 1)
            key = key.strip().lower()

            if not key or key in headers:
                raise ValueError("Invalid or duplicate proxy header")

            headers[key] = value.strip()

        if not valid_proxy_auth(headers.get("proxy-authorization", "")):
            await send_error(writer, "407 Proxy Authentication Required")
            return

        # Resolve once and connect only to these validated numeric IPs.
        addresses = await asyncio.wait_for(
            asyncio.to_thread(resolve_public_addresses, host),
            timeout=CONNECT_TIMEOUT,
        )

        last_error = None
        for address in addresses:
            try:
                upstream_reader, upstream_writer = await asyncio.wait_for(
                    asyncio.open_connection(address, 443),
                    timeout=CONNECT_TIMEOUT,
                )
                break
            except (OSError, asyncio.TimeoutError) as exc:
                last_error = exc

        if upstream_writer is None:
            raise ConnectionError("Could not connect to validated target") from last_error

        # Establish CONNECT before waiting for the TLS ClientHello.
        writer.write(
            b"HTTP/1.1 200 Connection Established\r\n\r\n"
        )
        await writer.drain()
        tunnel_established = True

        # Validate TLS SNI against the CONNECT hostname.
        raw_tls_bytes, sni_hostname = await read_client_hello(reader)

        if sni_hostname != host:
            raise ValueError("TLS SNI does not match CONNECT hostname")

        # Forward the validated ClientHello exactly once.
        upstream_writer.write(raw_tls_bytes)
        await upstream_writer.drain()

        tasks = {
            asyncio.create_task(pump(reader, upstream_writer)),
            asyncio.create_task(pump(upstream_reader, writer)),
        }

        try:
            done, pending = await asyncio.wait(
                tasks,
                timeout=MAX_TUNNEL_SECONDS,
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in done:
                try:
                    task.result()
                except TunnelLimitExceeded:
                    pass

        finally:
            for task in tasks:
                if not task.done():
                    task.cancel()

            await asyncio.gather(*tasks, return_exceptions=True)

            if not upstream_writer.is_closing():
                upstream_writer.close()

            if not writer.is_closing():
                writer.close()

    except (ValueError, UnicodeError, asyncio.IncompleteReadError,
            asyncio.LimitOverrunError, asyncio.TimeoutError,
            OSError, ConnectionError):
        if not writer.is_closing():
            if tunnel_established:
                writer.close()
            else:
                await send_error(writer, "403 Forbidden")
    finally:
        if upstream_writer and not upstream_writer.is_closing():
            upstream_writer.close()
            try:
                await upstream_writer.wait_closed()
            except Exception:
                pass

        if not writer.is_closing():
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass


async def main():
    if not ALLOWED_HOSTS:
        raise RuntimeError("PROXY_ALLOWED_HOSTS must be configured")

    if not PROXY_USERNAME or not PROXY_PASSWORD:
        raise RuntimeError("Proxy authentication credentials are required")

    async def limited_client_handler(reader, writer):
        try:
            await asyncio.wait_for(
                CONNECTION_SEMAPHORE.acquire(),
                timeout=1,
            )
        except asyncio.TimeoutError:
            await send_error(writer, "503 Service Unavailable")
            return

        try:
            await handle_client(reader, writer)
        finally:
            CONNECTION_SEMAPHORE.release()

    server = await asyncio.start_server(
        limited_client_handler,
        host="0.0.0.0",
        port=3128,
        limit=MAX_HEADER + 1,
    )

    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
