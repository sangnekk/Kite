import { AdminLayout } from "@/components/AdminLayout"
import { Dashboard } from "@/pages/Dashboard"
import { UserManagement } from "@/pages/UserManagement"
import { AppManagement } from "@/pages/AppManagement"
import { LogsExplorer } from "@/pages/LogsExplorer"
import { Billing } from "@/pages/Billing"
import { Revenue } from "@/pages/Revenue"
import { useAuth } from "@/context/AuthContext"
import { Login } from "@/pages/Login"

export function App() {
  const { user } = useAuth()

  if (!user) return <Login />

  return (
    <AdminLayout>
      {(page, setPage) => {
        switch (page) {
          case "dashboard":
            return <Dashboard onNavigate={setPage} />
          case "users":
            return <UserManagement />
          case "apps":
            return <AppManagement />
          case "logs":
            return <LogsExplorer />
          case "billing":
            return <Billing />
          case "revenue":
            return <Revenue />
          default:
            return <Dashboard onNavigate={setPage} />
        }
      }}
    </AdminLayout>
  )
}

export default App
