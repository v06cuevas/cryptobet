"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, AlertCircle, Copy, CheckCircle, Bitcoin, Coins, XCircle, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { createDeposit, uploadPaymentProof } from "@/app/actions/deposits"
import { getPaymentMethods } from "@/app/actions/payment-methods"

interface UserData {
  id: string
  name: string
  email: string
  role: string
  balance: number
  status?: string
  referralCode?: string
  referrals?: Array<{
    id: string
    name: string
    email: string
    date: string
    deposits: number
    earnings: number
  }>
  referralEarnings?: number
  referredBy?: string
  depositPending?: boolean
  depositAmount?: number
  depositMethod?: string
  depositPendingDate?: string
  depositId?: string
  depositHistory?: Array<{
    id: string
    amount: number
    method: string
    methodName: string
    date: string
    status: string
  }>
}

interface PaymentMethod {
  id: string
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
  btc_address: string | null
  btc_qr_code_url: string | null
  eth_address: string | null
  eth_qr_code_url: string | null
}

export default function DepositPage() {
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [depositMethod, setDepositMethod] = useState("bitcoin")
  const [error, setError] = useState("")
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isVerificationSent, setIsVerificationSent] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [depositApproved, setDepositApproved] = useState(false)
  const [depositRejected, setDepositRejected] = useState(false)
  const [supabaseUser, setSupabaseUser] = useState<any>(null)
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod | null>(null)
  const [isLoadingMethods, setIsLoadingMethods] = useState(true)

  const minDepositAmount = 20

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser()

      if (error || !authUser) {
        router.push("/login")
        return
      }

      setSupabaseUser(authUser)

      try {
        const userData = localStorage.getItem("user")
        if (userData) {
          setUser(JSON.parse(userData))
        } else {
          const basicUser: UserData = {
            id: authUser.id,
            name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Usuario",
            email: authUser.email || "",
            role: "user",
            balance: 0,
          }
          setUser(basicUser)
          localStorage.setItem("user", JSON.stringify(basicUser))
        }
      } catch (err) {
        console.error("Error al cargar datos del usuario:", err)
      }

      const { data: methods } = await getPaymentMethods()
      if (methods) {
        setPaymentMethods(methods)
      }
      setIsLoadingMethods(false)
    }

    checkAuth()
  }, [router])

  const handleAmountChange = (value: string) => {
    setAmount(value)
    setError("")
  }

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAmount(value)

    if (value && Number(value) < minDepositAmount) {
      setError(`El monto mínimo de depósito es de $${minDepositAmount}`)
    } else {
      setError("")
    }
  }

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount) {
      setError("Por favor ingresa un monto para depositar")
      return
    }

    if (Number(amount) < minDepositAmount) {
      setError(`El monto mínimo de depósito es de $${minDepositAmount}`)
      return
    }

    if (depositMethod === "bank") {
      if (!bankName || !accountNumber || !accountHolder) {
        setError("Por favor completa todos los campos de la transferencia bancaria")
        return
      }
    }

    setStep(2)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      if (!selectedFile.type.startsWith("image/") && selectedFile.type !== "application/pdf") {
        alert("Por favor sube un archivo JPG, PNG o PDF")
        return
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        alert("El archivo es demasiado grande. El tamaño máximo es 5MB.")
        return
      }

      setFile(selectedFile)

      if (selectedFile.type.startsWith("image/")) {
        const fileUrl = URL.createObjectURL(selectedFile)
        setPreviewUrl(fileUrl)
      } else {
        setPreviewUrl("/placeholder.svg?height=100&width=100&text=PDF")
      }
    }
  }

  const handleCopyAddress = (address: string) => {
    navigator.clipboard
      .writeText(address)
      .then(() => {
        alert("Dirección copiada al portapapeles")
      })
      .catch((err) => {
        console.error("Error al copiar: ", err)
      })
  }

  const handleCryptoMethodChange = (value: string) => {
    setDepositMethod(value)
  }

  const handleSubmitVerification = async () => {
    if (!file) {
      alert("Por favor sube un comprobante de pago")
      return
    }

    if (!supabaseUser) {
      alert("Usuario no autenticado")
      return
    }

    setIsUploading(true)

    try {
      const methodName =
        depositMethod === "bitcoin" ? "Bitcoin" : depositMethod === "ethereum" ? "Ethereum" : "Transferencia Bancaria"

      const depositResult = await createDeposit({
        amount: Number(amount),
        method: depositMethod,
        methodName: methodName,
        bankDetails:
          depositMethod === "bank"
            ? {
                bankName,
                accountNumber,
                accountHolder,
              }
            : undefined,
      })

      if (depositResult.error) {
        alert(depositResult.error)
        setIsUploading(false)
        return
      }

      const depositId = depositResult.data?.id

      const uploadResult = await uploadPaymentProof(file, depositId)

      if (uploadResult.error) {
        alert(uploadResult.error)
        setIsUploading(false)
        return
      }

      if (user) {
        const updatedUser = {
          ...user,
          depositPending: true,
          depositAmount: Number(amount),
          depositMethod: methodName,
          depositPendingDate: new Date().toLocaleDateString(),
          depositId: depositId,
        }
        localStorage.setItem("user", JSON.stringify(updatedUser))
      }

      setIsUploading(false)
      setIsVerificationSent(true)

      setTimeout(() => {
        window.location.href = "/profile?tab=financial"
      }, 3000)
    } catch (err) {
      console.error("Error processing deposit:", err)
      alert("Error al procesar el depósito")
      setIsUploading(false)
    }
  }

  if (!user || isLoadingMethods) return null

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href="/profile">
          <Button variant="ghost" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            <span>Volver</span>
          </Button>
        </Link>
      </div>

      {depositApproved && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800">¡Depósito aprobado!</AlertTitle>
            <AlertDescription className="text-green-700">
              Tu depósito ha sido aprobado y tu saldo ha sido actualizado.
            </AlertDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800 bg-transparent"
            onClick={() => setDepositApproved(false)}
          >
            Cerrar
          </Button>
        </Alert>
      )}

      {depositRejected && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-800">Depósito rechazado</AlertTitle>
            <AlertDescription className="text-red-700">
              Tu depósito ha sido rechazado. Por favor, contacta con soporte para más información.
            </AlertDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800 bg-transparent"
            onClick={() => setDepositRejected(false)}
          >
            Cerrar
          </Button>
        </Alert>
      )}

      <Card className="max-w-md mx-auto">
        {step === 1 ? (
          <form onSubmit={handleContinue}>
            <CardHeader>
              <CardTitle>Depositar Fondos</CardTitle>
              <CardDescription>Elige tu método de depósito preferido</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">
                  Saldo actual: <span className="font-bold">${user.balance.toFixed(2)}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Cantidad a depositar</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={handleCustomAmountChange}
                  min={minDepositAmount}
                  step="1"
                  placeholder="Ingresa el monto a depositar"
                  className="text-lg"
                />

                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm mt-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => handleAmountChange("20")}>
                    $20
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleAmountChange("50")}>
                    $50
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleAmountChange("100")}>
                    $100
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleAmountChange("200")}>
                    $200
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleAmountChange("500")}>
                    $500
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleAmountChange("1000")}>
                    $1000
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Metodo de Deposito</Label>
                <RadioGroup defaultValue="bitcoin" onValueChange={setDepositMethod}>
                  <div className="flex items-center space-x-2 p-3 border rounded-md mb-2">
                    <RadioGroupItem value="bitcoin" id="bitcoin" />
                    <Label htmlFor="bitcoin" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Bitcoin className="h-4 w-4 text-orange-500" />
                      <span>Bitcoin (BTC)</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-md mb-2">
                    <RadioGroupItem value="ethereum" id="ethereum" />
                    <Label htmlFor="ethereum" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Coins className="h-4 w-4 text-purple-500" />
                      <span>Ethereum (ETH)</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-md">
                    <RadioGroupItem value="bank" id="bank" />
                    <Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span>Transferencia Bancaria</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {depositMethod === "bank" && (
                <div className="space-y-3 p-4 bg-blue-50 rounded-md border border-blue-200">
                  <div className="space-y-2">
                    <Label htmlFor="bankName" className="text-sm font-medium">
                      Nombre del Banco
                    </Label>
                    <Input
                      id="bankName"
                      value={bankName || paymentMethods?.bank_name || ""}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Ej: Banco Global"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber" className="text-sm font-medium">
                      Número de Cuenta
                    </Label>
                    <Input
                      id="accountNumber"
                      value={accountNumber || paymentMethods?.account_number || ""}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Ej: 1234-5678-9012"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountHolder" className="text-sm font-medium">
                      Titular de la Cuenta
                    </Label>
                    <Input
                      id="accountHolder"
                      value={accountHolder || paymentMethods?.account_holder || ""}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="text-sm"
                    />
                  </div>
                </div>
              )}

              <div className={cn("w-full p-3 rounded-md", error ? "bg-red-50" : "bg-blue-50")}>
                <div className="flex items-start gap-2">
                  <AlertCircle className={cn("h-5 w-5 shrink-0 mt-0.5", error ? "text-red-500" : "text-blue-500")} />
                  <p className={cn("text-sm", error ? "text-red-700" : "text-blue-700")}>
                    {error ||
                      `El monto mínimo de depósito es de $${minDepositAmount}. Después de realizar el pago, deberás subir un comprobante para verificación.`}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" size="lg">
                Continuar
              </Button>
            </CardFooter>
          </form>
        ) : isVerificationSent ? (
          <div className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">¡Verificación enviada!</h3>
            <p className="text-muted-foreground mb-6">
              Tu comprobante de pago ha sido enviado correctamente. Recibirás una notificación cuando se verifique tu
              depósito.
            </p>
            <p className="text-sm text-muted-foreground">Redirigiendo a tu perfil...</p>
          </div>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Realizar Pago</CardTitle>
              <CardDescription>
                {depositMethod === "bank"
                  ? `Realiza una transferencia bancaria de $${amount} USD`
                  : `Transfiere ${amount} USD en ${depositMethod === "bitcoin" ? "Bitcoin" : "Ethereum"}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {depositMethod === "bank" ? (
                <div className="space-y-4 p-4 bg-blue-50 rounded-md border border-blue-200">
                  <h3 className="font-medium text-sm">Detalles de la Transferencia Bancaria</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Nombre del Banco</p>
                      <p className="font-mono text-sm font-medium">{bankName || paymentMethods?.bank_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Número de Cuenta</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-medium">
                          {accountNumber || paymentMethods?.account_number}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(accountNumber || paymentMethods?.account_number || "")
                            alert("Número de cuenta copiado")
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Titular de la Cuenta</p>
                      <p className="font-mono text-sm font-medium">{accountHolder || paymentMethods?.account_holder}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <Tabs defaultValue="qr" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="qr">Código QR</TabsTrigger>
                    <TabsTrigger value="address">Dirección</TabsTrigger>
                  </TabsList>
                  <TabsContent value="qr" className="pt-4">
                    <div className="flex flex-col items-center">
                      <div className="bg-white p-4 rounded-lg border mb-4">
                        <img
                          src={
                            depositMethod === "bitcoin"
                              ? paymentMethods?.btc_qr_code_url || `/placeholder.svg?height=200&width=200&text=BTC`
                              : paymentMethods?.eth_qr_code_url || `/placeholder.svg?height=200&width=200&text=ETH`
                          }
                          alt="Código QR"
                          className="h-48 w-48"
                        />
                      </div>
                      <p className="text-sm text-center text-muted-foreground">
                        Escanea este código QR con tu aplicación de{" "}
                        {depositMethod === "bitcoin" ? "Bitcoin" : "Ethereum"}
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="address" className="pt-4">
                    <div className="space-y-4">
                      <Label>Dirección de {depositMethod === "bitcoin" ? "Bitcoin" : "Ethereum"}</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-3 bg-muted rounded-md text-sm font-mono break-all">
                          {depositMethod === "bitcoin" ? paymentMethods?.btc_address : paymentMethods?.eth_address}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleCopyAddress(
                              (depositMethod === "bitcoin"
                                ? paymentMethods?.btc_address
                                : paymentMethods?.eth_address) || "",
                            )
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Envía exactamente el equivalente a ${amount} USD a esta dirección
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Subir comprobante de pago</h3>
                {previewUrl ? (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center">
                      <img
                        src={previewUrl || "/placeholder.svg"}
                        alt="Comprobante"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <p className="text-sm text-green-600 font-medium mt-2">Archivo seleccionado correctamente</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFile(null)
                        setPreviewUrl(null)
                      }}
                      className="w-full"
                    >
                      Cambiar imagen
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div
                      className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => document.getElementById("file-upload")?.click()}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          const droppedFile = e.dataTransfer.files[0]
                          if (droppedFile.type.startsWith("image/") || droppedFile.type === "application/pdf") {
                            setFile(droppedFile)
                            setPreviewUrl(URL.createObjectURL(droppedFile))
                          } else {
                            alert("Por favor sube un archivo JPG, PNG o PDF")
                          }
                        }
                      }}
                    >
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,application/pdf"
                        onChange={handleFileChange}
                      />
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-2 rounded-full bg-primary/10">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-primary"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">Haz clic para subir o arrastra y suelta</p>
                          <p className="text-sm text-muted-foreground">JPG, PNG, PDF (máx. 5MB)</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Formatos aceptados: JPG, PNG, PDF. Tamaño máximo: 5MB
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 p-3 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
                  <p className="text-sm text-amber-700">
                    Importante: Después de realizar la transferencia, debes subir un comprobante para que podamos
                    verificar tu depósito. Los fondos estarán disponibles en tu cuenta una vez verificada la
                    transacción.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" size="lg" onClick={handleSubmitVerification} disabled={!file || isUploading}>
                {isUploading ? "Enviando..." : "Enviar para verificación"}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  )
}
