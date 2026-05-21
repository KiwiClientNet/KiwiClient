import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import "./index.css";

const VITE_GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
    <GoogleOAuthProvider clientId={VITE_GOOGLE_CLIENT_ID}>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                    <StrictMode>
                        <App />
                    </StrictMode>
            </BrowserRouter>
        </QueryClientProvider>
    </GoogleOAuthProvider>
);
