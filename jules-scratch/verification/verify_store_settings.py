from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.goto("http://localhost:5173/admin")

    # Check if we need to log in
    password_field = page.get_by_label("Password")
    if password_field.is_visible():
        password_field.fill("admin123")
        page.get_by_role("button", name="Login").click()
        page.wait_for_url("http://localhost:5173/admin")

    # Navigate to the store settings page
    page.get_by_role("link", name="Store Settings").click()
    expect(page.get_by_text("Store Settings")).to_be_visible()

    # Take a screenshot of the new store settings interface
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)