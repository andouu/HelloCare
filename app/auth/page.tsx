import { Brand } from "../components/Brand";
import { FcGoogle } from "react-icons/fc";

export default function Login() {
  return <div className="w-full h-screen flex flex-col items-center justify-center px-4 gap-12 tracking-tight">
    <div className="">
      <div className="flex flex-col items-center gap-2">
        <Brand />
        <div className="flex flex-col items-center leading-5">
          <span>Simplifying healthcare for everybody</span>
          <span className="text-neutral-400">Sign into your account below</span>
        </div>
      </div>
    </div>
    <div className="w-full flex flex-col gap-2">
      <button className="w-full h-12 text-sm rounded-full border border-neutral-300 flex items-center justify-center gap-2 active:bg-neutral-100">
        <FcGoogle size="18" /> <span>Continue with Google</span>
      </button>
    </div>
  </div>

}