"use client"

import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  Settings,
  FileSearch,
  Zap,
  Download,
  Copy,
  Eye,
  PanelRight,
  PanelLeftClose,
  Sun,
  Moon,
  Keyboard,
  Plus,
  Wrench,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { useSidebar } from "@/components/ui/sidebar"
import { usePlatform } from "@/hooks/use-platform"
import { useCommandPalette } from "./command-palette-provider"

export function CommandPalette() {
  const { open, setOpen, getAction } = useCommandPalette()
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { toggleSidebar } = useSidebar()
  const { modifierKey } = usePlatform()

  const isResumeDetail = pathname.startsWith("/dashboard/optimized/")

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command Palette"
      description="Search for a command to run..."
      showCloseButton={false}
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard"))}
            keywords={["home"]}
          >
            <LayoutDashboard />
            <span>Go to Dashboard</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => router.push("/dashboard/profile"))
            }
            keywords={["upload", "master"]}
          >
            <FileText />
            <span>Go to Resumes</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => router.push("/dashboard/optimized"))
            }
            keywords={["tailored", "versions"]}
          >
            <Sparkles />
            <span>Go to Optimized</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => router.push("/dashboard/settings"))
            }
            keywords={["account", "preferences"]}
          >
            <Settings />
            <span>Go to Settings</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/ats-checker"))}
            keywords={["score", "check", "applicant", "tracking"]}
          >
            <FileSearch />
            <span>ATS Checker</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard"))}
            keywords={["optimize", "tailor", "job"]}
          >
            <Zap />
            <span>New Optimization</span>
          </CommandItem>
        </CommandGroup>

        {isResumeDetail && (
          <CommandGroup heading="AI Actions">
            <CommandItem
              onSelect={() => runCommand(() => getAction("aiImprove")?.())}
              keywords={["ai", "improve", "enhance", "rewrite"]}
            >
              <Sparkles />
              <span>Improve my summary</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => getAction("aiTailor")?.())}
              keywords={["ai", "tailor", "optimize", "job"]}
            >
              <Zap />
              <span>Tailor resume for this job</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => getAction("aiAddSkill")?.())}
              keywords={["ai", "skill", "add"]}
            >
              <Plus />
              <span>Add a skill with AI</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => getAction("aiBullets")?.())}
              keywords={["ai", "bullet", "improve", "experience"]}
            >
              <Sparkles />
              <span>Improve bullet points</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => getAction("aiFixATS")?.())}
              keywords={["ai", "ats", "fix", "score"]}
            >
              <Wrench />
              <span>Fix ATS issues</span>
            </CommandItem>
          </CommandGroup>
        )}

        {isResumeDetail && (
          <CommandGroup heading="Resume">
            <CommandItem
              onSelect={() => {
                const action = getAction("downloadDocx")
                if (action) runCommand(action)
              }}
              keywords={["export", "word"]}
            >
              <Download />
              <span>Download as DOCX</span>
              <CommandShortcut>{modifierKey}D</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                const action = getAction("copyContent")
                if (action) runCommand(action)
              }}
              keywords={["clipboard"]}
            >
              <Copy />
              <span>Copy Content</span>
              <CommandShortcut>{modifierKey}C</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                const action = getAction("previewHtml")
                if (action) runCommand(action)
              }}
              keywords={["html", "print"]}
            >
              <Eye />
              <span>Preview as HTML</span>
              <CommandShortcut>{modifierKey}P</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                const action = getAction("toggleAgentPanel")
                if (action) runCommand(action)
              }}
              keywords={["ai", "chat", "suggestions", "agent"]}
            >
              <PanelRight />
              <span>Toggle Agent Panel</span>
            </CommandItem>
          </CommandGroup>
        )}

        <CommandGroup heading="App">
          <CommandItem
            onSelect={() => runCommand(toggleSidebar)}
            keywords={["collapse", "expand", "menu"]}
          >
            <PanelLeftClose />
            <span>Toggle Sidebar</span>
            <CommandShortcut>{modifierKey}B</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))
            }
            keywords={["appearance", "light", "dark"]}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
            <span>Toggle Dark Mode</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false)
              // Dispatch a keyboard event to trigger the Shift+? shortcut
              window.dispatchEvent(
                new KeyboardEvent("keydown", {
                  key: "?",
                  shiftKey: true,
                  bubbles: true,
                })
              )
            }}
            keywords={["help", "hotkeys", "bindings"]}
          >
            <Keyboard />
            <span>Keyboard Shortcuts</span>
            <CommandShortcut>Shift ?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
