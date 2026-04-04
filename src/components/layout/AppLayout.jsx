import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppLayout() {
  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      <Sidebar />
      <div className="md:ml-[240px] flex flex-col min-h-screen transition-all duration-300">
        <div className="md:hidden h-14" />{/* spacer for mobile top bar */}
        <TopBar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}