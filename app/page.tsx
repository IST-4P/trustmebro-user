import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-5xl font-bold text-gray-900">TrustMeBro</h1>
        <p className="text-xl text-gray-600">Choose your portal</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/buyer">
            <Button size="lg" variant="buyer" className="min-w-[200px]">
              Buyer Portal
            </Button>
          </Link>
          <Link href="/seller">
            <Button size="lg" variant="seller" className="min-w-[200px]">
              Seller Portal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
