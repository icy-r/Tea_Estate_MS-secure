/* eslint-disable react/prop-types */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as tokenService from "../../services/auth-token.js";

// Landing page for "Sign in with Google". The backend finished the OpenID Connect
// code exchange and put our own short-lived JWT in the URL fragment (#token=...),
// which browsers never send to a server.
const GoogleCallback = ({ handleAuthEvt }) => {
  const navigate = useNavigate();
  // React StrictMode runs effects twice in development; the first run already
  // consumed and cleared the fragment, so the second must not treat it as missing.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    // Remove the token from the address bar and browser history straight away.
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) {
      navigate("/admin/auth/login?sso_error=missing_token", { replace: true });
      return;
    }
    tokenService.setToken(token);
    handleAuthEvt();
    navigate("/admin/", { replace: true });
  }, [handleAuthEvt, navigate]);

  return <div className="p-8 text-center">Signing you in with Google…</div>;
};

export default GoogleCallback;
