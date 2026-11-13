import asyncio
import ipaddress
import os
import socket
from urllib.parse import urlparse, urldefrag

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from playwright.async_api import async_playwright

app = FastAPI(title="Asset Sentinel SPA Scanner", version="0.2.0")

SCANNER_TOKEN = os.environ.get("SCANNER_TOKEN", "")

SCANNER_PROXY_SERVER = os.environ.get("SCANNER_PROXY_SERVER", "")
SCANNER_PROXY_USERNAME = os.environ.get("SCANNER_PROXY_USERNAME", "")
SCANNER_PROXY_PASSWORD = os.environ.get("SCANNER_PROXY_PASSWORD", "")
ALLOWED_HOSTS = {
    item.strip().lower().rstrip(".")
    for item in os.environ.get("SCANNER_ALLOWED_HOSTS", "").split(",")
    if item.strip()
}

MAX_PAGES = 20
MAX_SECONDS = 90
MAX_ENDPOINTS = 500


class ScanRequest(BaseModel):
    target_url: str
    authorization_confirmed: bool = False
    max_pages: int = Field(default=10, ge=1, le=MAX_PAGES)


def get_browser_proxy():
    if not all((
        SCANNER_PROXY_SERVER,
        SCANNER_PROXY_USERNAME,
        SCANNER_PROXY_PASSWORD,
    )):
        raise HTTPException(
            status_code=503,
            detail="Authenticated scanner proxy is not configured."
        )

    parsed = urlparse(SCANNER_PROXY_SERVER)

    if (
        parsed.scheme != "http"
        or parsed.hostname != "egress-proxy"
        or parsed.port != 3128
        or parsed.path not in ("", "/")
        or parsed.username
        or parsed.password
    ):
        raise HTTPException(
            status_code=503,
            detail="Scanner proxy configuration is invalid."
        )

    return {
        "server": SCANNER_PROXY_SERVER,
        "username": SCANNER_PROXY_USERNAME,
        "password": SCANNER_PROXY_PASSWORD,
    }


def validate_url(raw_url: str):
    try:
        parsed = urlparse(raw_url)

        if parsed.scheme != "https":
            raise ValueError("Only HTTPS URLs are allowed.")

        if not parsed.hostname or parsed.username or parsed.password:
            raise ValueError("Invalid target URL.")

        if parsed.port not in (None, 443):
            raise ValueError("Only the standard HTTPS port is allowed.")

        host = parsed.hostname.lower().rstrip(".")

        if not ALLOWED_HOSTS or host not in ALLOWED_HOSTS:
            raise ValueError("Hostname is not in the configured scanner allowlist.")

        addresses = socket.getaddrinfo(
            host, 443, type=socket.SOCK_STREAM
        )

        if not addresses:
            raise ValueError("Target DNS resolution returned no addresses.")

        for item in addresses:
            address = ipaddress.ip_address(item[4][0])

            if not address.is_global:
                raise ValueError("Private or non-public IP addresses are blocked.")

        return parsed, host

    except HTTPException:
        raise
    except (ValueError, socket.gaierror, OSError):
        raise HTTPException(
            status_code=400,
            detail="Target URL failed security validation."
        )


def validate_scan_scope(raw_url: str, expected_host: str):
    parsed, host = validate_url(raw_url)

    if host != expected_host:
        raise HTTPException(
            status_code=400,
            detail="Navigation is outside the approved scan scope."
        )

    return parsed, host


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "scanner": "playwright",
        "allowlist_configured": bool(ALLOWED_HOSTS),
    }


@app.post("/scan")
async def scan(
    request: ScanRequest,
    x_scanner_token: str = Header(default=""),
):
    if not SCANNER_TOKEN or x_scanner_token != SCANNER_TOKEN:
        raise HTTPException(401, "Invalid scanner authentication.")

    if not request.authorization_confirmed:
        raise HTTPException(403, "Explicit authorization is required.")

    if not ALLOWED_HOSTS:
        raise HTTPException(
            503,
            "Dynamic scanning is disabled: configure SCANNER_ALLOWED_HOSTS."
        )

    _, allowed_host = validate_url(request.target_url)

    visited = set()
    pages = []
    endpoints = []
    errors = []
    blocked_requests = []

    async def crawl():
        async with async_playwright() as playwright:
            browser_proxy = get_browser_proxy()

            browser = await playwright.chromium.launch(
                headless=True,
                proxy=browser_proxy,
                args=[
                    "--disable-quic",
                    "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
                ],
            )

            try:
                context = await browser.new_context(
                    ignore_https_errors=False,
                    service_workers="block",
                )

                async def guard_request(route):
                    raw = route.request.url

                    try:
                        _, host = validate_url(raw)

                        if host != allowed_host:
                            raise ValueError("Host is outside the scan scope.")

                        await route.continue_()

                    except Exception:
                        if len(blocked_requests) < 100:
                            blocked_requests.append(raw[:500])
                        await route.abort("blockedbyclient")

                await context.route("**/*", guard_request)

                page = await context.new_page()
                page.set_default_navigation_timeout(15000)
                page.set_default_timeout(5000)

                def record_response(response):
                    try:
                        parsed = urlparse(response.url)

                        if (
                            parsed.scheme == "https"
                            and parsed.hostname == allowed_host
                            and len(endpoints) < MAX_ENDPOINTS
                        ):
                            endpoints.append({
                                "url": response.url[:1000],
                                "method": response.request.method,
                                "status": response.status,
                            })
                    except Exception:
                        pass

                page.on("response", record_response)

                queue = [request.target_url]

                while queue and len(visited) < request.max_pages:
                    raw_url = urldefrag(queue.pop(0))[0]

                    if raw_url in visited:
                        continue

                    try:
                        _, host = validate_url(raw_url)

                        if host != allowed_host:
                            continue

                        visited.add(raw_url)

                        response = await page.goto(
                            raw_url,
                            wait_until="domcontentloaded",
                        )

                        if response is None:
                            continue

                        # Verify the final navigation URL after redirects.
                        validate_scan_scope(response.url, allowed_host)
                        validate_scan_scope(page.url, allowed_host)

                        observations = await page.evaluate("""() => ({
                          title: document.title,
                          url: location.href,
                          links: Array.from(
                            document.querySelectorAll('a[href]')
                          ).map(a => a.href).slice(0, 200),
                          storage: {
                            localStorageKeys: Object.keys(localStorage),
                            sessionStorageKeys: Object.keys(sessionStorage)
                          },
                          forms: Array.from(document.forms).map(f => ({
                            action: f.action,
                            method: f.method
                          }))
                        })""")

                        pages.append({
                            "url": page.url[:1000],
                            "title": observations["title"][:300],
                            "forms": observations["forms"][:100],
                            "storage": observations["storage"],
                        })

                        for link in observations["links"]:
                            try:
                                _, link_host = validate_url(link)
                                clean_link = urldefrag(link)[0]

                                if (
                                    link_host == allowed_host
                                    and clean_link not in visited
                                    and clean_link not in queue
                                ):
                                    queue.append(clean_link)

                            except Exception:
                                continue

                    except Exception as exc:
                        if len(errors) < 50:
                            errors.append({
                                "url": raw_url[:500],
                                "error": str(exc)[:300],
                            })

                await context.close()

            finally:
                await browser.close()

    try:
        await asyncio.wait_for(crawl(), timeout=MAX_SECONDS)
        timed_out = False
    except asyncio.TimeoutError:
        timed_out = True

    return {
        "target": request.target_url,
        "pages_scanned": len(pages),
        "pages": pages,
        "endpoints": endpoints,
        "findings": [],
        "errors": errors,
        "blocked_requests": blocked_requests,
        "timed_out": timed_out,
        "scope": (
            "Bounded browser reconnaissance only. "
            "No exploitability or vulnerability verification performed."
        ),
    }
