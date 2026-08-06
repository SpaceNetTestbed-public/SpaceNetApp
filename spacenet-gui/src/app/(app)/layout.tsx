import { TopNav } from '@/components/TopNav'
import { FloatingDocsButton } from '@/components/FloatingDocsButton'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <TopNav />
      <div className="max-w-[1920px] mx-auto">{children}</div>
      <FloatingDocsButton />
    </div>
  )
}

