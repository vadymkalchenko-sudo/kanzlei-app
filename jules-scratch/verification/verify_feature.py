from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:3000")

        # Login
        page.get_by_label("Benutzername").fill("admin")
        page.get_by_label("Passwort").fill("password")
        page.get_by_role("button", name="Anmelden").click()

        # Wait for the main page to load
        page.wait_for_selector("h1:has-text('A-W-R Aktenverwaltung')")

        # Click the toggle switch
        page.locator("#due-today-toggle").click()

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)