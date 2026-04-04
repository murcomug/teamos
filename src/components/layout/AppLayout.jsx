import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppLayout() {
  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      <Sidebar />
      <div className="ml-[240px] flex flex-col min-h-screen transition-all duration-300">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}