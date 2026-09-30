const onboardingKey = "morrow.onboarding.complete";
const query = new URLSearchParams(location.search);
const providers = {
  google: document.getElementById("google-sign-in"),
  microsoft: document.getElementById("microsoft-sign-in"),
};
const connectionStatus = document.getElementById("connection-status");
const instructions = document.getElementById("setup-instructions");
const authMessage = document.getElementById("auth-message");
const signedInPanel = document.getElementById("signed-in-panel");
const continueButton = document.getElementById("continue-button");

if (
  localStorage.getItem(onboardingKey) === "true" &&
  !query.has("auth") &&
  !query.has("manage")
) {
  location.replace("/chat");
} else {
  initializeOnboarding();
}

async function initializeOnboarding() {
  continueButton.addEventListener("click", () => {
    localStorage.setItem(onboardingKey, "true");
    location.assign("/chat");
  });

  const authResult = query.get("auth");
  if (authResult === "denied") {
    showAuthMessage(
      "Sign-in was cancelled. You can try again or continue without an account.",
    );
  } else if (authResult === "failed") {
    showAuthMessage(
      "Sign-in could not be completed. Check the OAuth app settings and try again.",
    );
  } else if (authResult === "expired") {
    showAuthMessage(
      "This sign-in link expired. Start again from the sign-in button.",
    );
  }

  try {
    const [providerResponse, sessionResponse] = await Promise.all([
      fetch("/api/auth/providers"),
      fetch("/api/auth/session"),
    ]);
    const providerData = await providerResponse.json();
    const sessionData = await sessionResponse.json();
    providers.google.disabled = !providerData.google;
    providers.microsoft.disabled = !providerData.microsoft;
    providers.google.addEventListener("click", () =>
      location.assign("/auth/google"),
    );
    providers.microsoft.addEventListener("click", () =>
      location.assign("/auth/microsoft"),
    );

    document.getElementById("google-callback").textContent =
      `Google: ${providerData.callbacks.google}`;
    document.getElementById("microsoft-callback").textContent =
      `Microsoft: ${providerData.callbacks.microsoft}`;

    const missing = [];
    if (!providerData.google) missing.push("Google");
    if (!providerData.microsoft) missing.push("Microsoft");
    if (missing.length) {
      instructions.hidden = false;
      connectionStatus.textContent = `${missing.join(" and ")} sign-in ${missing.length === 1 ? "is" : "are"} not configured on this computer.`;
    } else {
      connectionStatus.classList.add("available");
      connectionStatus.textContent = "Google and Microsoft sign-in are ready.";
    }

    if (sessionData.signedIn) {
      signedInPanel.hidden = false;
      document.getElementById("signed-in-label").textContent =
        `Signed in with ${sessionData.providerName} as ${sessionData.email}.`;
      continueButton.textContent = "Continue to Morrow";
    }
  } catch {
    providers.google.disabled = true;
    providers.microsoft.disabled = true;
    instructions.hidden = false;
    connectionStatus.textContent = "The local Morrow server is unavailable.";
  }
}

function showAuthMessage(message) {
  authMessage.textContent = message;
  authMessage.hidden = false;
}
