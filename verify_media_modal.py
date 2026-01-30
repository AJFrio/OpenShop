from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Go to admin page to set localStorage
        page.goto("http://localhost:5173/admin")
        page.evaluate("localStorage.setItem('openshop_admin_token', 'fake-token')")

        # Go to media page
        page.goto("http://localhost:5173/admin/media")

        # Wait for page load
        page.wait_for_timeout(2000)

        # Click Add media button
        # There are two "Add media" texts: header and button. Use the button.
        page.get_by_role("button", name="Add media").click()

        # Wait for modal
        page.wait_for_timeout(1000)

        # Take screenshot
        page.screenshot(path="verification.png")

        # Check for Google Drive text (should NOT be there)
        # Note: "Google Drive" might be in the source code comments but not visible text.
        # page.content() returns HTML.
        # We should check visible text.

        visible_text = page.inner_text("body")
        if "Google Drive" in visible_text:
            print("FAILED: Google Drive tab visible")
        else:
            print("SUCCESS: Google Drive tab not visible")

        browser.close()

if __name__ == "__main__":
    run()
