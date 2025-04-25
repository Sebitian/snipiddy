import DeployButton from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";
import { MantineProviders } from "./mantine-providers";
import { NavigationMenu } from "@/components/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Snipiddy - AI Scanner of Restaurant Menus ",
  description: "",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className={`${geistSans.className} bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen`}>
        {/* <MantineProviders> */}
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <main className="min-h-screen flex flex-col items-center">
              <div className="flex-1 w-full flex flex-col gap-20 items-center">
                <nav className="w-full flex justify-center border-b border-gray-200 dark:border-gray-800 h-16 bg-white dark:bg-gray-800 shadow-sm">
                  <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
                    <div className="flex gap-5 items-center font-semibold">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="ghost" size="icon" className="mr-2 text-gray-700 dark:text-gray-300">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" title="Navigation Menu">
                          <div className="flex flex-col gap-8 py-4">
                            <div className="px-2">
                              <h2 className="text-xl font-bold">Snipiddy</h2>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your menu scanning companion</p>
                            </div>
                            <NavigationMenu />
                          </div>
                        </SheetContent>
                      </Sheet>
                      <Link href={"/"} className="text-lg font-bold">Snipiddy</Link>
                    </div>
                    {!hasEnvVars ? <EnvVarWarning /> : <HeaderAuth />}
                  </div>
                </nav>
                
                <div className="flex flex-col gap-20 max-w-5xl p-5">
                  {children}
                </div>

                <footer className="w-full flex items-center justify-center border-t border-gray-200 dark:border-gray-800 mx-auto text-center text-xs gap-8 py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">
                  <p>
                    Powered by{" "}
                    <a
                      href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
                      target="_blank"
                      className="font-bold hover:underline"
                      rel="noreferrer"
                    >
                      Supabase
                    </a>
                  </p>
                  <ThemeSwitcher />
                </footer>
              </div>
            </main>
          </ThemeProvider>
        {/* </MantineProviders> */}
      </body>
    </html>
  );
}
