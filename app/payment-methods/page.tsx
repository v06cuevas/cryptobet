"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, Building2, Bitcoin, Coins } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function PaymentMethodsPage() {
  const { toast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null)

  // Transferencia bancaria
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountHolder, setAccountHolder] = useState("")

  // Bitcoin
  const [addressBtc, setAddressBtc] = useState("")
  const [qrCodeBtc, setQrCodeBtc] = useState<File | null>(null)
  const [qrCodeBtcUrl, setQrCodeBtcUrl] = useState("")

  // Ethereum
  const [addressEth, setAddressEth] = useState("")
  const [qrCodeEth, setQrCodeEth] = useState<File | null>(null)
  const [qrCodeEthUrl, setQrCodeEthUrl] = useState("")

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  const loadPaymentMethods = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("payment_methods").select("*").limit(1).single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      if (data) {
        setPaymentMethodId(data.id)
        setBankName(data.bank_name || "")
        setAccountNumber(data.account_number || "")
        setAccountHolder(data.account_holder || "")
        setAddressBtc(data.btc_address || "")
        setQrCodeBtcUrl(data.btc_qr_code_url || "")
        setAddressEth(data.eth_address || "")
        setQrCodeEthUrl(data.eth_qr_code_url || "")
      }
    } catch (error) {
      console.error("Error loading payment methods:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los métodos de pago",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const uploadQrCode = async (file: File, type: "btc" | "eth"): Promise<string> => {
    const fileExt = file.name.split(".").pop()
    const fileName = `qr-${type}-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError, data } = await supabase.storage.from("qr-codes").upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage.from("qr-codes").getPublicUrl(filePath)

    return urlData.publicUrl
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      console.log("[v0] Starting save process...")

      const {
        data: { user },
      } = await supabase.auth.getUser()
      console.log("[v0] Current user:", user?.id)

      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "Debes iniciar sesión para guardar cambios",
          variant: "destructive",
        })
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      console.log("[v0] User profile:", profileData)
      console.log("[v0] Profile error:", profileError)

      if (profileError || !profileData) {
        toast({
          title: "Error de perfil",
          description: "No se pudo verificar tu perfil. Contacta al administrador.",
          variant: "destructive",
        })
        return
      }

      console.log("[v0] User role from profile:", profileData.role)

      if (profileData.role !== "admin") {
        toast({
          title: "Acceso denegado",
          description: "Solo los administradores pueden modificar los métodos de pago",
          variant: "destructive",
        })
        return
      }

      let btcQrUrl = qrCodeBtcUrl
      let ethQrUrl = qrCodeEthUrl

      // Subir QR de Bitcoin si hay un archivo nuevo
      if (qrCodeBtc) {
        console.log("[v0] Uploading BTC QR code...")
        btcQrUrl = await uploadQrCode(qrCodeBtc, "btc")
        console.log("[v0] BTC QR uploaded:", btcQrUrl)
      }

      // Subir QR de Ethereum si hay un archivo nuevo
      if (qrCodeEth) {
        console.log("[v0] Uploading ETH QR code...")
        ethQrUrl = await uploadQrCode(qrCodeEth, "eth")
        console.log("[v0] ETH QR uploaded:", ethQrUrl)
      }

      const paymentData = {
        bank_name: bankName,
        account_number: accountNumber,
        account_holder: accountHolder,
        btc_address: addressBtc,
        btc_qr_code_url: btcQrUrl,
        eth_address: addressEth,
        eth_qr_code_url: ethQrUrl,
        updated_at: new Date().toISOString(),
      }

      console.log("[v0] Payment data to save:", paymentData)

      if (paymentMethodId) {
        // Actualizar registro existente
        console.log("[v0] Updating existing payment method:", paymentMethodId)
        const { error } = await supabase.from("payment_methods").update(paymentData).eq("id", paymentMethodId)

        if (error) {
          console.error("[v0] Update error:", error)
          throw error
        }
        console.log("[v0] Update successful")
      } else {
        // Crear nuevo registro
        console.log("[v0] Creating new payment method...")
        const { data, error } = await supabase.from("payment_methods").insert([paymentData]).select().single()

        if (error) {
          console.error("[v0] Insert error:", error)
          throw error
        }
        if (data) {
          setPaymentMethodId(data.id)
          console.log("[v0] Insert successful, new ID:", data.id)
        }
      }

      toast({
        title: "✅ Cambios guardados",
        description: "Los métodos de pago se actualizaron correctamente",
      })

      // Recargar para obtener las URLs actualizadas
      await loadPaymentMethods()
    } catch (error: any) {
      console.error("[v0] Error saving payment methods:", error)

      let errorMessage = "No se pudieron guardar los métodos de pago"

      if (error.message?.includes("row-level security")) {
        errorMessage = "No tienes permisos para modificar los métodos de pago. Contacta al administrador."
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "❌ Error al guardar",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl mb-20">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Métodos de Pago</h1>
        <p className="text-muted-foreground">
          Configura los métodos de pago que verán los usuarios al hacer un depósito
        </p>
      </div>

      <Tabs defaultValue="bank" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bank" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Transferencia Bancaria
          </TabsTrigger>
          <TabsTrigger value="crypto" className="flex items-center gap-2">
            <Bitcoin className="h-4 w-4" />
            Criptomonedas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle>Transferencia Bancaria</CardTitle>
              <CardDescription>Configura los datos de la cuenta bancaria para recibir transferencias</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Nombre del Banco</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Ej: Banco Nacional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Número de Cuenta</Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Ej: 1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountHolder">Titular de la Cuenta</Label>
                <Input
                  id="accountHolder"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crypto">
          <Card>
            <CardHeader>
              <CardTitle>Criptomonedas</CardTitle>
              <CardDescription>Configura las direcciones y códigos QR para Bitcoin y Ethereum</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bitcoin */}
              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <Bitcoin className="h-5 w-5 text-orange-500" />
                  <h3 className="font-semibold">Bitcoin (BTC)</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressBtc">Dirección de Billetera BTC</Label>
                  <Input
                    id="addressBtc"
                    value={addressBtc}
                    onChange={(e) => setAddressBtc(e.target.value)}
                    placeholder="Ej: 3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qrCodeBtc">Código QR de Bitcoin</Label>
                  <Input
                    id="qrCodeBtc"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setQrCodeBtc(e.target.files[0])
                        const url = URL.createObjectURL(e.target.files[0])
                        setQrCodeBtcUrl(url)
                      }
                    }}
                  />
                  {qrCodeBtcUrl && (
                    <div className="mt-4 p-4 border rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground mb-2">Vista previa del QR BTC:</p>
                      <img
                        src={qrCodeBtcUrl || "/placeholder.svg"}
                        alt="QR Code BTC Preview"
                        className="max-w-[200px] mx-auto"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Ethereum */}
              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-purple-500" />
                  <h3 className="font-semibold">Ethereum (ETH)</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressEth">Dirección de Billetera ETH</Label>
                  <Input
                    id="addressEth"
                    value={addressEth}
                    onChange={(e) => setAddressEth(e.target.value)}
                    placeholder="Ej: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qrCodeEth">Código QR de Ethereum</Label>
                  <Input
                    id="qrCodeEth"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setQrCodeEth(e.target.files[0])
                        const url = URL.createObjectURL(e.target.files[0])
                        setQrCodeEthUrl(url)
                      }
                    }}
                  />
                  {qrCodeEthUrl && (
                    <div className="mt-4 p-4 border rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground mb-2">Vista previa del QR ETH:</p>
                      <img
                        src={qrCodeEthUrl || "/placeholder.svg"}
                        alt="QR Code ETH Preview"
                        className="max-w-[200px] mx-auto"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="w-full sm:w-auto">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
