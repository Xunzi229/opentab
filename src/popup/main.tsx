import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "../global.css"
import "./styles.css"
import { App } from "./App"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Popup root element not found")
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
