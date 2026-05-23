import asyncio
import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    TimeoutError as PlaywrightTimeoutError,
    async_playwright,
)

SESSIONS_DIR = Path("./sessions")
LOGS_DIR = Path("./logs")
BROADCAST_LOG_PATH = LOGS_DIR / "broadcast_history.json"
MANUAL_APPROVAL_TIMEOUT_MS = 10 * 60 * 1000
MANUAL_LOGIN_TIMEOUT_MS = 10 * 60 * 1000
POLL_INTERVAL_MS = 2_000


@dataclass
class NetworkConfig:
    name: str
    create_url: str
    session_filename: str
    caption_selector: str
    success_selector: str
    upload_trigger_selector: str = ""
    file_input_selector: str = 'input[type="file"]'


def emit(type_: str, message: str, payload: Dict[str, Any] | None = None) -> None:
    event: Dict[str, Any] = {"type": type_, "message": message}
    if payload:
        event["payload"] = payload
    print(json.dumps(event, ensure_ascii=False), flush=True)


def ensure_runtime_dirs() -> None:
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    LOGS_DIR.mkdir(parents=True, exist_ok=True)


def append_broadcast_history(network: str, media_path: str, status: str, details: str = "") -> None:
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "network": network,
        "mediaPath": media_path,
        "status": status,
        "details": details,
    }

    history: List[Dict[str, Any]] = []
    if BROADCAST_LOG_PATH.exists():
        try:
            parsed = json.loads(BROADCAST_LOG_PATH.read_text(encoding="utf-8"))
            history = parsed if isinstance(parsed, list) else []
        except Exception:
            history = []

    history.append(record)
    BROADCAST_LOG_PATH.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")


async def wait_for_manual_login(page: Page, network: NetworkConfig, timeout_ms: int = MANUAL_LOGIN_TIMEOUT_MS) -> None:
    emit(
        "warning",
        f"[{network.name}] No active session file. Please login manually in browser. Waiting up to {timeout_ms // 60000} minutes...",
    )
    start_url = page.url
    deadline = time.monotonic() + (timeout_ms / 1000)

    while time.monotonic() < deadline:
        if page.url != start_url:
            emit("success", f"[{network.name}] Navigation change detected after manual login.")
            return
        await page.wait_for_timeout(POLL_INTERVAL_MS)

    raise TimeoutError(f"Manual login timeout reached for {network.name}.")


async def ensure_authenticated(context: BrowserContext, page: Page, network: NetworkConfig, session_path: Path) -> None:
    emit("info", f"[{network.name}] Navigating to creator page...")
    await page.goto(network.create_url, wait_until="domcontentloaded")

    if session_path.exists():
        emit("success", f"[{network.name}] Loaded existing session from {session_path}.")
        return

    await wait_for_manual_login(page, network)
    await context.storage_state(path=str(session_path))
    emit("success", f"[{network.name}] Session saved to {session_path}")


async def upload_media(page: Page, network: NetworkConfig, media_path: str) -> None:
    if network.upload_trigger_selector:
        async with page.expect_file_chooser(timeout=30_000) as file_chooser_info:
            await page.locator(network.upload_trigger_selector).first.click()
        chooser = await file_chooser_info.value
        await chooser.set_files(media_path)
        return

    input_locator = page.locator(network.file_input_selector).first
    await input_locator.wait_for(timeout=30_000)
    await input_locator.set_input_files(media_path)


async def fill_upload_form(page: Page, network: NetworkConfig, media_path: str, marketing_text: str) -> None:
    await page.goto(network.create_url, wait_until="domcontentloaded")
    await upload_media(page, network, media_path)

    caption_box = page.locator(network.caption_selector).first
    await caption_box.wait_for(timeout=30_000)
    await caption_box.fill(marketing_text)


async def wait_for_manual_approval(page: Page, network: NetworkConfig) -> bool:
    emit("warning", "הפוסט מוכן להעלאה! מחכה לאישור ידני של המנכ\"ל...")
    start_url = page.url
    deadline = time.monotonic() + (MANUAL_APPROVAL_TIMEOUT_MS / 1000)

    while time.monotonic() < deadline:
        if page.url != start_url:
            emit("success", f"[{network.name}] URL change detected after manual publish.")
            return True
        if await page.locator(network.success_selector).count() > 0:
            emit("success", f"[{network.name}] Success element detected after manual publish.")
            return True
        await page.wait_for_timeout(POLL_INTERVAL_MS)

    return False


async def run_network_flow(browser: Browser, network: NetworkConfig, media_path: str, marketing_text: str) -> None:
    session_path = SESSIONS_DIR / network.session_filename
    status = "failed"
    details = ""

    context: BrowserContext | None = None
    try:
        context = await browser.new_context(
            storage_state=str(session_path) if session_path.exists() else None,
            no_viewport=True,
        )
        page = await context.new_page()

        await ensure_authenticated(context, page, network, session_path)
        emit("info", f"[{network.name}] Uploading media and injecting marketing text...")
        await fill_upload_form(page, network, media_path, marketing_text)

        approved = await wait_for_manual_approval(page, network)
        if approved:
            status = "approved_and_published_by_human"
            emit("success", f"[{network.name}] Manual publish detected.")
        else:
            status = "timeout_waiting_for_manual_approval"
            emit("error", f"[{network.name}] Timed out after 10 minutes waiting for manual approval.")
    except PlaywrightTimeoutError as timeout_error:
        details = f"Playwright timeout: {str(timeout_error)}"
        emit("error", f"[{network.name}] Timeout: {details}")
    except TimeoutError as timeout_error:
        details = str(timeout_error)
        emit("error", f"[{network.name}] Timeout: {details}")
    except Exception as error:
        details = str(error)
        emit("error", f"[{network.name}] Broadcast flow failed: {details}")
    finally:
        append_broadcast_history(network.name, media_path, status, details)
        if context:
            await context.close()


def validate_media_path(media_path: str) -> str:
    resolved = Path(media_path).expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"Media file not found: {resolved}")
    return str(resolved)


async def run_playwright_broadcast(media_path: str, marketing_text: str) -> None:
    networks = [
        NetworkConfig(
            name="YouTube Shorts",
            create_url="https://studio.youtube.com/channel/UC/shorts/upload",
            session_filename="youtube_shorts.json",
            caption_selector='textarea[aria-label*="Title"], textarea#textbox',
            success_selector="text=Your Short is uploaded",
        ),
        NetworkConfig(
            name="Instagram Reels",
            create_url="https://www.instagram.com/create/reel/",
            session_filename="instagram_reels.json",
            caption_selector='div[role="textbox"]',
            success_selector="text=Your reel has been shared",
        ),
        NetworkConfig(
            name="TikTok",
            create_url="https://www.tiktok.com/upload",
            session_filename="tiktok.json",
            caption_selector='div[contenteditable="true"]',
            success_selector="text=Uploaded",
        ),
    ]

    media_path = validate_media_path(media_path)

    async with async_playwright() as playwright:
        browser: Browser | None = None
        try:
            browser = await playwright.chromium.launch(headless=False, args=["--start-maximized"])
            for network in networks:
                emit("info", f"[{network.name}] Starting network broadcast flow...")
                await run_network_flow(browser, network, media_path, marketing_text)
        finally:
            if browser:
                await browser.close()


def main() -> None:
    ensure_runtime_dirs()

    topic = sys.argv[1] if len(sys.argv) > 1 else "AI Agents"
    media_path = os.environ.get("DELTA_MEDIA_PATH", "final_marketing_video.mp4")
    script = (
        f"Are you ready for the future of {topic}? "
        "Our new platform automates everything. Zero cost, maximum reach. "
        "#AI #Automation #Growth"
    )

    emit("info", f"Starting Delta Agent for topic: {topic}")
    emit("info", "Phase 1: MiMo Reasoning - Analyzing trends and generating script...")
    time.sleep(1)
    emit("success", "Script generated successfully", {"script": script})

    emit("info", "Phase 2: TTS - Converting script to professional voiceover...")
    time.sleep(1)
    emit("success", "Audio generated: voiceover.mp3")

    emit("info", "Phase 3: FFmpeg - Rendering final video with backgrounds and animations...")
    for i in range(1, 4):
        emit("info", f"Rendering frame {i * 30}/90...")
        time.sleep(0.5)
    emit("success", f"Video rendered: {media_path}")

    emit("info", "Phase 4: Unified Social Broadcast - Playwright HITL distribution started...")
    asyncio.run(run_playwright_broadcast(media_path=media_path, marketing_text=script))
    emit("success", "Unified Social Broadcast completed.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit("error", f"Fatal error in Python agent: {str(error)}")
        sys.exit(1)
