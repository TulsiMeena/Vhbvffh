import asyncio
from playwright.async_api import async_playwright

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        # Start server
        import subprocess
        process = subprocess.Popen(["python3", "-m", "http.server", "3000"])
        await asyncio.sleep(2)

        try:
            await page.goto("http://localhost:3000")

            # 1. Check Home
            await page.wait_for_selector("h1:has-text('_technical_01')")
            print("Home page loaded.")

            # 2. Check Nav links
            links = await page.eval_on_selector_all(".nav-link", "els => els.map(el => el.textContent)")
            print(f"Nav links found: {links}")
            if any(x in ["AI Studio", "AI Chat", "Settings"] for x in links):
                print("FAILURE: AI links still present in desktop nav!")
            else:
                print("SUCCESS: AI links removed from desktop nav.")

            # 3. Check AR Page
            await page.click("a:has-text('AR Studio')")
            await page.wait_for_selector("model-viewer")
            print("AR Studio page loaded and <model-viewer> found.")
            await page.screenshot(path="verify_ar_only.png")

            # 4. Check that AI pages don't exist in DOM
            pages = await page.eval_on_selector_all(".page", "els => els.map(el => el.id)")
            print(f"Pages in DOM: {pages}")
            if any(x in ["page-studio", "page-chat", "page-settings"] for x in pages):
                print("FAILURE: AI page containers still in DOM!")
            else:
                print("SUCCESS: AI page containers removed.")

        finally:
            process.terminate()
            await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())
