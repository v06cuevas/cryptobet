"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChevronLeft, Save, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface UserData {
  id: string
  name: string
  email: string
  role: string
  balance: number
  registeredAt?: string
  status?: string
  vipLevel?: number
  lastBalanceUpdateByAdmin?: boolean
}

const vipLevels = [
  { level: 0, name: "Básico", depositRequired: 0, monthlyLimit: 150, retirosCantidad: 1, color: "bg-gray-400" },
  { level: 1, name: "Principiante", depositRequired: 20, monthlyLimit: 15, retirosCantidad: 2, color: "bg-zinc-400" },
  { level: 2, name: "Bronce", depositRequired: 40, monthlyLimit: 30, retirosCantidad: 2, color: "bg-amber-700" },
  { level: 3, name: "Plata", depositRequired: 100, monthlyLimit: 75, retirosCantidad: 2, color: "bg-slate-400" },
  { level: 4, name: "Oro", depositRequired: 500, monthlyLimit: 375, retirosCantidad: 3, color: "bg-yellow-500" },
  { level: 5, name: "Platino", depositRequired: 1022, monthlyLimit: 767, retirosCantidad: 3, color: "bg-zinc-300" },
  {
    level: 6,
    name: "Esmeralda",
    depositRequired: 1318,
    monthlyLimit: 989,
    retirosCantidad: 3,
    color: "bg-emerald-500",
  },
  { level: 7, name: "Rubí", depositRequired: 1700, monthlyLimit: 1275, retirosCantidad: 3, color: "bg-red-600" },
  { level: 8, name: "Zafiro", depositRequired: 2193, monthlyLimit: 1645, retirosCantidad: 4, color: "bg-blue-600" },
  { level: 9, name: "Diamante", depositRequired: 2829, monthlyLimit: 2122, retirosCantidad: 4, color: "bg-cyan-300" },
  { level: 10, name: "VIP Black", depositRequired: 3649, monthlyLimit: 2737, retirosCantidad: 5, color: "bg-black" },
]

export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [adminUser, setAdminUser] = useState<UserData | null>(null)
  const [user, setUser] = useState<UserData | null>(null)
  const [balance, setBalance] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchUserData = async () => {
      // Check if admin is logged in
      const userData = localStorage.getItem("user")
      if (!userData) {
        router.push("/login")
        return
      }

      const parsedUser = JSON.parse(userData)
      if (parsedUser.role !== "admin") {
        router.push("/profile")
        return
      }

      setAdminUser(parsedUser)

      try {
        const supabase = createClient()
        const { data: profile, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", params.id)
          .single()

        if (fetchError || !profile) {
          setError("Usuario no encontrado")
          setLoading(false)
          return
        }

        const foundUser: UserData = {
          id: profile.id,
          name: profile.name || "Sin nombre",
          email: profile.email || "Sin email",
          role: profile.role || "user",
          balance: Number(profile.balance) || 0,
          registeredAt: profile.created_at,
          status: profile.status || "En espera",
          vipLevel: profile.vip_level || 0,
        }

        setUser(foundUser)
        setBalance(foundUser.balance.toString())
        setLoading(false)
      } catch (err) {
        console.error("Error loading user:", err)
        setError("Error al cargar el usuario")
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router, params.id])

  const handleSave = async () => {
    if (!user) return

    setError("")
    setSaving(true)

    try {
      const newBalance = Number.parseFloat(balance)

      if (isNaN(newBalance)) {
        setError("El balance debe ser un número válido")
        setSaving(false)
        return
      }

      const supabase = createClient()

      // Update user in Supabase
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          balance: newBalance,
          status: user.status,
          vip_level: user.vipLevel,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (updateError) {
        console.error("Error updating user:", updateError)
        setError("Error al guardar los cambios")
        setSaving(false)
        return
      }

      // Update localStorage if the edited user is the currently logged in user
      try {
        const currentLoggedInUser = localStorage.getItem("user")
        if (currentLoggedInUser) {
          const parsedLoggedInUser = JSON.parse(currentLoggedInUser)

          if (parsedLoggedInUser.id === user.id) {
            const updatedUser = {
              ...parsedLoggedInUser,
              balance: newBalance,
              status: user.status,
              vipLevel: user.vipLevel,
            }
            localStorage.setItem("user", JSON.stringify(updatedUser))
          }
        }
      } catch (e) {
        console.error("Error al actualizar la sesión del usuario:", e)
      }

      // Show success message
      setSuccess(true)
      setSaving(false)

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      console.error("Error saving changes:", err)
      setError("Error al guardar los cambios")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  if (!adminUser || !user) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || "Error al cargar la información del usuario"}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <Link href="/admin">
                <Button>Volver al Panel de Administración</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href="/admin">
          <Button variant="ghost" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            <span>Volver al Panel de Administración</span>
          </Button>
        </Link>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Editar Usuario: {user.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {success && (
            <Alert className="bg-green-50 text-green-700 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-700" />
              <AlertDescription>Cambios guardados correctamente</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="id">ID de Usuario</Label>
              <Input id="id" value={user.id} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Input id="role" value={user.role} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={user.name} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="balance" className="text-primary font-medium">
                Saldo Disponible
              </Label>
              <Input
                id="balance"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="text-lg font-bold border-primary"
              />
              <p className="text-sm text-muted-foreground">
                Modifique el saldo disponible del usuario. Este cambio se aplicará inmediatamente.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="status" className="text-primary font-medium">
                Estado de la cuenta
              </Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <select
                    id="status"
                    className="w-full p-2 border rounded-md"
                    value={user?.status || "En espera"}
                    onChange={(e) => setUser({ ...user!, status: e.target.value })}
                  >
                    <option value="En espera">En espera</option>
                    <option value="Verificado">Verificado</option>
                    <option value="Suspendido">Suspendido</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      user?.status === "Verificado"
                        ? "bg-green-500"
                        : user?.status === "Suspendido"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                    }`}
                  ></div>
                  <span className="text-sm font-medium">{user?.status || "En espera"}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Cambie el estado de la cuenta del usuario. Este cambio afectará inmediatamente a sus permisos.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="vipLevel" className="text-primary font-medium">
                Nivel VIP
              </Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <select
                    id="vipLevel"
                    className="w-full p-2 border rounded-md"
                    value={user?.vipLevel || 0}
                    onChange={(e) => setUser({ ...user!, vipLevel: Number.parseInt(e.target.value) })}
                  >
                    {vipLevels.map((level) => (
                      <option key={level.level} value={level.level}>
                        {level.level} - {level.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${vipLevels[user?.vipLevel || 0].color}`}></div>
                  <span className="text-sm font-medium">{vipLevels[user?.vipLevel || 0].name}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Cambie el nivel VIP del usuario. Este cambio afectará sus beneficios y límites de retiro.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Información importante:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Los cambios en el saldo se reflejarán inmediatamente en la cuenta del usuario.</li>
                  <li>Todas las modificaciones quedan registradas en el sistema para auditoría.</li>
                  <li>El usuario recibirá una notificación por email sobre los cambios realizados.</li>
                  <li>El nivel VIP solo puede ser modificado por administradores y afecta los límites de retiro.</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Link href="/admin">
            <Button variant="outline">Cancelar</Button>
          </Link>
          <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
