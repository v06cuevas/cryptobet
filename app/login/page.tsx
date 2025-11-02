"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { loginUser } from "@/app/actions/auth"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const referralCode = searchParams.get("ref")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!email || !password) {
        setError("Por favor ingrese su correo y contraseña")
        setLoading(false)
        return
      }

      const result = await loginUser(email, password)

      if (!result.success) {
        setError(result.error || "Error al iniciar sesión")
        setLoading(false)
        return
      }

      localStorage.setItem("user", JSON.stringify(result.user))

      if (result.user?.role === "admin") {
        router.push("/admin")
      } else {
        router.push("/markets")
      }
    } catch (err) {
      console.error("Error en el proceso de login:", err)
      setError("Ocurrió un error al iniciar sesión")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">
            Ingrese sus credenciales para acceder a su cuenta
            {referralCode && (
              <div className="mt-2 text-sm bg-primary/10 p-2 rounded-md">
                Has sido invitado con el código: <span className="font-bold">{referralCode}</span>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link href="#" className="text-sm text-primary hover:underline">
                  ¿Olvidó su contraseña?
                </Link>
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>

            <div className="text-center text-sm">
              ¿No tiene una cuenta?{" "}
              <Link
                href={referralCode ? `/register?ref=${referralCode}` : "/register"}
                className="text-primary hover:underline"
              >
                Registrarse
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
