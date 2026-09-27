import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
        
        print("Navigating to login...")
        await page.goto("http://localhost:8081/login")
        await page.fill('input[type="email"]', "frontend-test2@test.com")
        await page.fill('input[type="password"]', "password123")
        await page.click('button[type="submit"]')
        
        await page.wait_for_url("**/dashboard", timeout=10000)
        await page.wait_for_timeout(2000)
        
        print("Clicking Explore Templates...")
        await page.click('button:has-text("Explore Templates")')
        await page.wait_for_timeout(2000)
        
        content = await page.locator(".flex-1.overflow-y-auto").text_content()
        print(f"Modal content text: {content}")
        
        await page.screenshot(path="debug_modal.png")
        await browser.close()

asyncio.run(main())
