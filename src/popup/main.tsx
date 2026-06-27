import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import App from "./App.tsx"
import { ColorModeSync } from "./components/ColorModeSync"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider value={defaultSystem}>
      <ColorModeSync />
      <App />
    </ChakraProvider>
  </StrictMode>,
)
