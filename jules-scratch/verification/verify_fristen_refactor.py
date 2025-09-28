import re
from playwright.sync_api import Page, expect

def test_fristen_panel_workflow(page: Page):
    """
    This test verifies the complete workflow of the new Fristen (deadline) panel.
    It checks for:
    1. The new two-column layout in Aktenansicht.
    2. Creation of a new deadline.
    3. One-click completion of the deadline.
    4. The deadline moving from the 'Active' tab to the 'History' tab.
    """
    # 1. Arrange: Go to the application's homepage.
    # The dev server should be running on port 3000.
    page.goto("http://localhost:3000")

    # Wait for the main content to be ready and click the first case file.
    # We target the first row in the table body to navigate to the detail view.
    expect(page.get_by_role("table")).to_be_visible(timeout=10000)
    first_case_row = page.locator("tbody tr").first
    expect(first_case_row).to_be_visible()
    first_case_row.click()

    # 2. Assert: Check for the new layout and FristenPanel.
    # The FristenPanel should be visible on the right.
    fristen_panel_heading = page.get_by_role("heading", name="Fristen-Management")
    expect(fristen_panel_heading).to_be_visible()

    # 3. Act: Create a new deadline.
    page.get_by_role("button", name="+ Neue Frist").click()

    # The modal for creating a new deadline should appear.
    modal_heading = page.get_by_role("heading", name="Neue Frist erstellen")
    expect(modal_heading).to_be_visible()

    # Fill in the form.
    deadline_title = "Wichtige Klageeinreichung"
    page.get_by_label("Titel").fill(deadline_title)
    page.get_by_label("Datum").fill("2025-10-15")
    page.get_by_role("button", name="Erstellen").click()

    # Assert: The new deadline should now be in the "Aktive Fristen" list.
    active_list = page.locator('div:has-text("Aktive Fristen") + div')
    new_deadline = active_list.get_by_text(deadline_title)
    expect(new_deadline).to_be_visible()

    # 4. Act: Mark the deadline as complete.
    # Find the checkbox associated with the new deadline and click it.
    deadline_item = active_list.locator(f'div:has-text("{deadline_title}")').first
    checkbox = deadline_item.get_by_role("checkbox")
    checkbox.click()

    # Assert: The deadline should disappear from the active list.
    expect(new_deadline).not_to_be_visible()

    # 5. Act: Switch to the "History" tab.
    # The regex allows us to find the button even as the count changes.
    history_tab_button = page.get_by_role("button", name=re.compile(r"History \(\d+\)"))
    history_tab_button.click()

    # Assert: The completed deadline should be in the "History" list.
    history_list = page.locator('div:has-text("History") + div')
    completed_deadline = history_list.get_by_text(deadline_title)
    expect(completed_deadline).to_be_visible()

    # 6. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")