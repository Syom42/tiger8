
  import { createRoot } from "react-dom/client";
  import App from "./app/App";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<App />);

  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations().then(registrations => {
      void Promise.all(registrations.map(registration => registration.unregister()));
    });
  }
  