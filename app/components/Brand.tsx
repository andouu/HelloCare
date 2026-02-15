import Image from "next/image";

export function Brand() {
  return <div className="flex items-center gap-2">
    <Image src="/hellocare_logo.svg" alt="HelloCare Logo" width={22} height={22} />
    <span className="text-2xl font-bold tracking-tight">hellocare</span>
  </div>
}