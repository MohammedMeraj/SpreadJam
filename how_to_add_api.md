# Google Sheets API Setup Guide - spreadjam

To use `spreadjam`, you must connect it to the Google Sheets API using a Google Service Account. Follow these steps to obtain a credentials JSON file and connect your sheet.

---

## Step 1: Create a Google Cloud Project

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Log in with your Google Account.
3.  Click the **Select a project** dropdown at the top left of the screen and choose **New Project**.
4.  Give your project a name (e.g. `spreadjam-sheets-project`) and click **Create**.

---

## Step 2: Enable the Google Sheets API

1.  Ensure your new project is selected in the top-left dropdown.
2.  Open the left navigation menu and go to **APIs & Services** > **Library**.
3.  In the search bar, type `Google Sheets API`.
4.  Click on the **Google Sheets API** card.
5.  Click the **Enable** button.

---

## Step 3: Create a Service Account

1.  Open the left navigation menu and go to **APIs & Services** > **Credentials**.
2.  Click **+ CREATE CREDENTIALS** at the top and select **Service Account**.
3.  Fill out the details:
    *   **Service account name:** `spreadjam-service-account`
    *   **Service account ID:** (auto-generated)
4.  Click **CREATE AND CONTINUE**.
5.  Click **DONE** (no roles or user permissions are strictly required for basic sheets operations).

---

## Step 4: Generate a JSON Key File

1.  Under the **Service Accounts** section of the Credentials page, click the email address of the service account you just created.
2.  Go to the **Keys** tab at the top.
3.  Click **ADD KEY** > **Create new key**.
4.  Select **JSON** as the key type and click **Create**.
5.  Save the downloaded JSON file to your local computer (e.g., in your home folder or a secure directory).
    *   *Warning: Keep this key file safe. It grants access to sheets shared with this service account!*

---

## Step 5: Connect and Share Google Sheet

1.  Create a new spreadsheet at [sheets.new](https://sheets.new) or open an existing one.
2.  Look at the URL of your Google Sheet. It will look like this:
    `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0`
    Copy the `SPREADSHEET_ID` part (a long string of characters).
3.  Click the **Share** button in the top-right corner of Google Sheets.
4.  Paste the **Service Account email address** (found in the JSON file as `client_email`, e.g., `spreadjam-service-account@...iam.gserviceaccount.com`).
5.  Set permissions to **Editor** and click **Share** (uncheck "Notify people" if desired).

---

## Step 6: Configure spreadjam in Terminal

Now, navigate to your local repository directory where you initialized `spreadjam init`, and run:

```bash
spreadjam config --credentials /path/to/your/downloaded-key.json --spreadsheet YOUR_SPREADSHEET_ID
```

Test the connection:
```bash
spreadjam status
```
If successful, it will display the sheet name and available tabs!
