"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, BarChart3, History, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const Navigation: React.FC = () => {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Gagal keluar");
    }
  };

  const navItems = [
    {
      href: "/dashboard",
      label: "Dasbor",
      icon: LayoutDashboard,
    },
    {
      href: "/charts",
      label: "Analisis",
      icon: BarChart3,
    },
    {
      href: "/history",
      label: "Riwayat",
      icon: History,
    },
  ];

  return (
    <nav className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4">
      <div className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </Button>
            </Link>
          );
        })}

        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/10 mt-4"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Keluar
        </Button>
      </div>
    </nav>
  );
};

export default Navigation;
