import asyncio
import ipaddress
import os
import socket
from urllib.parse import urlparse

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from playwright.async_api import async_playwright

app = FastAPI(title="Asset Sentinel QA Runner", version="0.1.0")

RUNNER_TOKEN = os.environ.get("QA_RUNNER_TOKEN", "")
PROXY_SERVER = os.environ.get("QA_PROXY_SERVER", "")
PROXY_USERNAME = os.environ.get("QA_PROXY_USERNAME", "")
PROXY_PASSWORD = os.environ.get("QA_PROXY_PASSWORD", "")

ALLOWED_HOSTS = {
    item.strip().lower().rstrip(".")
    for item in os.environ.get("SCANNER_ALLOWED_HOSTS", "").split(",")
    if item.strip()
}

MAX_SECONDS = 60


class RunRequest(BaseModel):
    target_url: str = Field(min_length=9, max_length=2048)
    authorization_confirmed: bool = False


def validate_target(raw_url: str):
    try:
        parsed = urlparse(raw_url)

        if parsed.scheme != "https":
            raise ValueError("HTTPS is required.")

        if not parsed.hostname or parsed.username or parsed.password:
            raise ValueError("Invalid target URL.")

        if parsed.port not in (None, 443):
            raise ValueError("Only port 443 is allowed.")

        host = parsed.hostname.encode("idna").decode("ascii").lower().rstrip(".")

        if not ALLOWED_HOSTS or host not in ALLOWED_HOSTS:
            raise ValueError("Target host is not allowlisted.")

        addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)

        if not addresses:
            raise ValueError("Target DNS returned no addresses.")

        for item in addresses:
            address = ipaddress.ip_address(item[4][0])
            if not address.is_global:
                raise ValueError("Private or non-public target IP blocked.")

        return parsed, host

    except (ValueError, UnicodeError, socket.gaierror, OSError):
        raise HTTPException(400, "Target URL failed security validation.")


def get_proxy():
    if not all((PROXY_SERVER, PROXY_USERNAME, PROXY_PASSWORD)):
        raise HTTPException(503, "Authenticated QA proxy is not configured.")

    parsed = urlparse(PROXY_SERVER)

    if (
        parsed.scheme != "http"
        or parsed.hostname != "egress-proxy"
        or parsed.port != 3128
        or parsed.path not in ("", "/")
        or parsed.username
        or parsed.password
    ):
        raise HTTPException(503, "QA proxy configuration is invalid.")

    return {
        "server": PROXY_SERVER,
        "username": PROXY_USERNAME,
        "password": PROXY_PASSWORD,
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "runner": "playwright",
        "allowlist_configured": bool(ALLOWED_HOSTS),
    }


@app.post("/run")
async def run_tests(
    request: RunRequest,
    x_runner_token: str = Header(default=""),
):
    if not RUNNER_TOKEN or x_runner_token != RUNNER_TOKEN:
        raise HTTPException(401, "Invalid QA runner authentication.")

    if not request.authorization_confirmed:
        raise HTTPException(403, "Explicit target authorization is required.")

    _, allowed_host = validate_target(request.target_url)
    proxy = get_proxy()

    cases = []
    console_errors = []
    page_errors = []
    failed_requests = []

    def record(name, passed, details=""):
        cases.append({
            "name": name,
            "result": "Passed" if passed else "Failed",
            "error": None if passed else (details or "Check failed."),
        })

    async def execute():
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(
                headless=True,
                proxy=proxy,
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
                    parsed = urlparse(route.request.url)
                    host = (parsed.hostname or "").lower().rstrip(".")

                    if (
                        parsed.scheme == "https"
                        and host == allowed_host
                        and parsed.port in (None, 443)
                    ):
                        await route.continue_()
                    else:
                        if len(failed_requests) < 50:
                            failed_requests.append({
                                "url": route.request.url[:500],
                                "reason": "Blocked: outside approved HTTPS host scope.",
                            })
                        await route.abort("blockedbyclient")

                await context.route("**/*", guard_request)

                page = await context.new_page()
                page.set_default_navigation_timeout(15000)
                page.set_default_timeout(5000)

                def on_console(msg):
                    if msg.type == "error" and len(console_errors) < 50:
                        console_errors.append(msg.text[:300])

                def on_page_error(exc):
                    if len(page_errors) < 50:
                        page_errors.append(str(exc)[:300])

                def on_request_failed(req):
                    if len(failed_requests) < 50:
                        failed_requests.append({
                            "url": req.url[:500],
                            "reason": (req.failure or "Request failed")[:300],
                        })

                page.on("console", on_console)
                page.on("pageerror", on_page_error)
                page.on("requestfailed", on_request_failed)

                response = None
                navigation_error = None

                try:
                    response = await page.goto(
                        request.target_url,
                        wait_until="domcontentloaded",
                    )
                except Exception as exc:
                    navigation_error = str(exc)[:300]

                final = urlparse(page.url) if page.url else None
                final_host = (final.hostname or "").lower().rstrip(".") if final else ""

                in_scope = bool(
                    final
                    and final.scheme == "https"
                    and final_host == allowed_host
                    and final.port in (None, 443)
                )

                record(
                    "Navigation completed",
                    response is not None and in_scope and navigation_error is None,
                    navigation_error or (
                        "Navigation did not return a response or left approved scope."
                    ),
                )

                status = response.status if response else None
                record(
                    "HTTP response is successful",
                    status is not None and 200 <= status < 400,
                    f"Received HTTP status {status}" if status is not None else "No HTTP response.",
                )

                title = ""
                body_text = ""

                if in_scope:
                    try:
                        title = await page.title()
                        body_text = await page.locator("body").inner_text(timeout=5000)
                    except Exception:
                        pass

                record("Page has a title", bool(title.strip()), "Document title is empty.")
                record("Page body is visible", bool(body_text.strip()), "Page body is empty.")

                record(
                    "No uncaught JavaScript page errors",
                    not page_errors,
                    "; ".join(page_errors[:3]),
                )

                record(
                    "No browser console errors",
                    not console_errors,
                    "; ".join(console_errors[:3]),
                )

                await context.close()

            finally:
                await browser.close()

    started = asyncio.get_running_loop().time()
    timed_out = False

    try:
        await asyncio.wait_for(execute(), timeout=MAX_SECONDS)
    except asyncio.TimeoutError:
        timed_out = True
        record("Execution completed within time limit", False, "QA run timed out.")
    except Exception as exc:
        record("Browser execution", False, str(exc)[:300])

    duration = round(asyncio.get_running_loop().time() - started, 2)
    total = len(cases)
    passed = sum(case["result"] == "Passed" for case in cases)
    failed = sum(case["result"] == "Failed" for case in cases)

    return {
        "suite": "functional",
        "status": "Passed" if total > 0 and failed == 0 and not timed_out else (
            "Failed" if failed > 0 else "Partial"
        ),
        "total": total,
        "passed": passed,
        "failed": failed,
        "skipped": 0,
        "durationSec": duration,
        "cases": cases,
        "diagnostics": {
            "consoleErrors": console_errors[:20],
            "pageErrors": page_errors[:20],
            "failedRequests": failed_requests[:20],
        },
        "timedOut": timed_out,
    }
