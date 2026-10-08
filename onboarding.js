const onboardingKey = "morrow.onboarding.complete";
const query = new URLSearchParams(location.search);
const googleSignIn = document.getElementById("google-sign-in");
const connectionStatus = document.getElementById("connection-status");
const instructions = document.getElementById("setup-instructions");
const authMessage = document.getElementById("auth-message");
const signedInPanel = document.getElementById("signed-in-panel");
const continueButton = document.getElementById("continue-button");

initializeOnboarding();

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
    googleSignIn.disabled = !providerData.google;
    googleSignIn.addEventListener("click", () =>
      location.assign("/auth/google"),
    );

    document.getElementById("google-callback").textContent =
      `Google: ${providerData.callbacks.google}`;

    if (!providerData.google) {
      instructions.hidden = false;
      connectionStatus.textContent =
        "Google sign-in is not configured on this computer.";
    } else {
      connectionStatus.classList.add("available");
      connectionStatus.textContent = "Google sign-in is ready.";
    }

    if (sessionData.signedIn) {
      if (authResult === "success") {
        localStorage.setItem(onboardingKey, "true");
        location.replace("/chat");
        return;
      }
      signedInPanel.hidden = false;
      document.getElementById("signed-in-label").textContent =
        `Signed in with ${sessionData.providerName} as ${sessionData.email}.`;
      continueButton.textContent = "Continue to Morrow";
    }
  } catch {
    googleSignIn.disabled = true;
    instructions.hidden = false;
    connectionStatus.textContent = "The local Morrow server is unavailable.";
  }
}

function showAuthMessage(message) {
  authMessage.textContent = message;
  authMessage.hidden = false;
}
