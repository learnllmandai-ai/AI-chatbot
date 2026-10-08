# Morrow

A local AI assistant for questions, writing, planning, study, and programming help. Morrow supports Markdown replies, searchable conversation history, quick follow-ups, response feedback, adjustable appearance and text size, and optional Google sign-in.

## Requirements

- Node.js 20 or later
- A Gemini API key for AI-generated replies
- Google OAuth application credentials only if you want account sign-in

Sign-in is optional and only verifies identity. Morrow does not request access to email, files, or calendars. Signing in does not sync chat history or provide an AI model key.

## Run locally

In PowerShell, from this folder:

```powershell
npm.cmd install
$env:GEMINI_API_KEY = "your-gemini-api-key"
node server.js
```

Open http://127.0.0.1:3000. If you omit the API key, onboarding and chat management still work, but Morrow cannot generate AI replies. The default model is `gemini-2.5-flash`; set `GEMINI_MODEL` to use a different Gemini model. Set `PORT` to change the local port.

## Enable Google sign-in

Register a Google OAuth application and add the URL below as a **Web** redirect URI:

- Google: `http://127.0.0.1:3000/auth/callback/google`

In Google Cloud Console, configure the OAuth consent screen and create a Web application OAuth client.

Set the credentials in the same PowerShell window used to start Morrow:

```powershell
$env:GOOGLE_CLIENT_ID = "your-google-client-id"
$env:GOOGLE_CLIENT_SECRET = "your-google-client-secret"
$env:AUTH_SESSION_SECRET = (node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))")
node server.js
```

Stop an already-running server with Ctrl+C before restarting it. The onboarding page shows the callback URLs for the current port. If you change `PORT`, register the updated callback URL with the provider.

The sign-in flow requests only `openid`, `email`, and `profile`. The server uses OpenID Connect authorization code with PKCE, checks state and nonce, and verifies the identity token. It issues a signed, HTTP-only session cookie that expires after 12 hours. Signing out of Morrow does not sign you out of the provider globally.

## Privacy and limitations

The server listens on `127.0.0.1` and is intended for one person on their own computer. Do not expose it to a public network. Conversations and settings are stored in the current browser; they are not synced to the signed-in account. With AI enabled, submitted messages are sent to Google Gemini under your account and are subject to its policies. Avoid sending information you would not share with that provider.

Keep OAuth client secrets, `AUTH_SESSION_SECRET`, and `GEMINI_API_KEY` out of source control. Morrow reads these values from the server environment and does not send them to browser code.

## License

Morrow is available under the [MIT License](LICENSE).