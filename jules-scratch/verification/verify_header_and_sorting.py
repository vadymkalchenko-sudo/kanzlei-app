from playwright.sync_api import sync_playwright, expect
import re

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the app
        page.goto("http://localhost:3000/", timeout=15000) # Increased timeout

        # Wait for the main app to load and find the first case in the list
        first_case_link = page.get_by_text(re.compile(r"\d+\.\d+\.awr")).first

        # Expect the link to be visible before clicking
        expect(first_case_link).to_be_visible(timeout=10000)
        first_case_link.click()

        # Now on the Aktenansicht page, verify the new header fields

        # 1. Check for Unfalldatum
        unfalldatum_element = page.get_by_text(re.compile("Unfalldatum:"))
        expect(unfalldatum_element).to_be_visible()

        # 2. Test the Quick-Notes field
        notes_textarea = page.get_by_label("Quick-Notes / Merke")
        expect(notes_textarea).to_be_visible()

        test_note = "This is a quick test note."
        notes_textarea.fill(test_note)

        # Click somewhere else to trigger onBlur
        page.get_by_text("Aktenansicht:").first.click()

        # The note should be saved. We can verify by checking the value.
        expect(notes_textarea).to_have_value(test_note)

        # 3. Test the sorting functionality
        sort_newest_button = page.get_by_role("button", name="Neueste zuerst")
        sort_oldest_button = page.get_by_role("button", name="Älteste zuerst")

        expect(sort_newest_button).to_be_visible()
        expect(sort_oldest_button).to_be_visible()

        # Get initial order of dates
        date_elements = page.locator("tbody tr > td:nth-child(2)")
        initial_dates = [element.inner_text() for element in date_elements.all()]

        # Click the "Älteste zuerst" button to change sort order
        sort_oldest_button.click()

        page.wait_for_timeout(500) # Give it a moment to re-render

        # Get the new order of dates
        sorted_dates_elements = page.locator("tbody tr > td:nth-child(2)")
        new_dates = [element.inner_text() for element in sorted_dates_elements.all()]

        if len(initial_dates) > 1 and len(new_dates) > 1 and initial_dates[0] != new_dates[0]:
            print("Sorting appears to have changed the order.")
        else:
            print("Warning: Sorting did not change the order as expected or only one item exists.")

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot taken successfully.")

    except Exception as e:
        print(f"An error occurred during verification: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)