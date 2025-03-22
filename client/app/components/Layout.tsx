import React from "react";
import Navbar from "./Navbar";

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return (
        <div>
            <Navbar />
            <main className="p-4">{children}</main>
        </div>
    );
}
