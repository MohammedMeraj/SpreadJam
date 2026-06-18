# How to Publish - spreadjam

Follow these steps to publish `spreadjam` (or your modified version of it) to the NPM registry.

## Step 1: Prepare your package

1.  **Unique Name:** Check if the name `spreadjam` is available on [npmjs.com](https://www.npmjs.com). If it is taken, you can change the `"name"` field in your `package.json` to something unique, or publish it under a scope (e.g. `@yourusername/spreadjam`).
2.  **Version:** Ensure the version is correct (e.g., `1.0.0` for initial release).
3.  **Files to Include:** NPM will automatically include files defined in `package.json` or follow your `.gitignore`. Ensure the files `bin/cli.js`, `lib/config.js`, and `lib/api.js` are included in the package.

## Step 2: Create an NPM Account

If you don't have an NPM account:
1.  Go to [npmjs.com/signup](https://www.npmjs.com/signup) and create an account.
2.  Verify your email address (important: you cannot publish packages without a verified email).

## Step 3: Login to NPM via Terminal

Open your terminal and run:
```bash
npm login
```
Follow the prompts to enter your username, password, email, and one-time password (OTP) if you have two-factor authentication enabled.

## Step 4: Test Locally Before Publishing

It's highly recommended to test the package locally first.

1.  **Link the package globally:**
    In the root of the `spreadjam` project folder, run:
    ```bash
    npm link
    ```
    This creates a global symlink of `spreadjam` on your local machine.
2.  **Verify CLI command:**
    Open a new terminal session or window and run:
    ```bash
    spreadjam --help
    ```
    You should see the help documentation printed successfully.
3.  **To unlink:**
    When you are done testing, run `npm unlink -g spreadjam` inside the folder.

## Step 5: Publish the Package

Run the following command in the root of the project:
```bash
npm publish
```

*Note: If you are publishing a scoped package (e.g., `@username/spreadjam`), you must publish it as public using:*
```bash
npm publish --access public
```

---

## Step 6: Verify and Use

Once published, you or anyone else can install it globally via:
```bash
npm install -g spreadjam
```
or run it directly without installing using npx:
```bash
npx spreadjam status
```
