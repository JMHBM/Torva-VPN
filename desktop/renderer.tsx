import { createRoot } from "react-dom/client";
import { TorvaApp } from "@/components/torva-app";
import "./app.css";

const el = document.getElementById("root");
if (!el) throw new Error("root missing");
createRoot(el).render(<TorvaApp />);
