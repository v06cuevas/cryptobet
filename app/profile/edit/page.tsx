"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Save, User, Mail, Phone, Home, AlertCircle } from "lucide-react"

export default function EditProfilePage() {
  const [formData, setFormData] = useState({
    email: "juan.perez@email.com",
    altEmail: "juan.perez.rodriguez@email.com",
    phone: "+34 612 345 678",
    altPhone: "+34 912 345 678",
    address: "Calle Serrano 123, Piso 4B, 28006 Madrid, España",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Limpiar error cuando el usuario comienza a escribir
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Validar email
    if (!formData.email) {
      newErrors.email = "El correo electrónico es obligatorio"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "El formato del correo electrónico no es válido"
    }

    // Validar teléfono
    if (!formData.phone) {
      newErrors.phone = "El teléfono móvil es obligatorio"
    }

    // Validar dirección
    if (!formData.address) {
      newErrors.address = "La dirección es obligatoria"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      setIsSaving(true)

      // Simular guardado
      setTimeout(() => {
        setIsSaving(false)
        setSaveSuccess(true)

        // Redirigir después de mostrar mensaje de éxito
        setTimeout(() => {
          window.location.href = "/profile"
        }, 1500)
      }, 1000)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/profile">
          <Button variant="ghost" className="flex items-center gap-2 p-0">
            <ChevronLeft className="h-4 w-4" />
            <span>Volver</span>
          </Button>
        </Link>
      </div>

      <Card className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <span>Editar Información de Contacto</span>
            </CardTitle>
            <CardDescription>Actualiza tu información personal y de contacto</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {saveSuccess && (
              <div className="bg-green-50 p-3 rounded-md text-green-700 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-green-500" />
                <p>¡Información actualizada correctamente!</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email principal */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>Correo electrónico principal</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                <p className="text-xs text-muted-foreground">Este correo se usará para notificaciones importantes</p>
              </div>

              {/* Email alternativo */}
              <div className="space-y-2">
                <Label htmlFor="altEmail">Correo electrónico alternativo</Label>
                <Input id="altEmail" name="altEmail" type="email" value={formData.altEmail} onChange={handleChange} />
                <p className="text-xs text-muted-foreground">Opcional, para recuperación de cuenta</p>
              </div>

              {/* Teléfono principal */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>Teléfono móvil</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                <p className="text-xs text-muted-foreground">Se usará para verificación en dos pasos</p>
              </div>

              {/* Teléfono alternativo */}
              <div className="space-y-2">
                <Label htmlFor="altPhone">Teléfono alternativo</Label>
                <Input id="altPhone" name="altPhone" type="tel" value={formData.altPhone} onChange={handleChange} />
                <p className="text-xs text-muted-foreground">Opcional, para contacto adicional</p>
              </div>

              {/* Dirección */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span>Dirección completa</span>
                </Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className={errors.address ? "border-red-500" : ""}
                />
                {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
                <p className="text-xs text-muted-foreground">
                  Incluye calle, número, piso, código postal, ciudad y país
                </p>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
                <p className="text-sm text-blue-700">
                  Mantén tu información de contacto actualizada para recibir notificaciones importantes y facilitar la
                  recuperación de tu cuenta en caso de problemas de acceso.
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 pt-6">
            <Link href="/profile">
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
