import { CarFront } from "lucide-react";
import { SITE } from "@/lib/config";
export default function Brand() {
  return (
    <>
      <div className="automobile-mark" aria-hidden="true">
        <span>VP</span>
        <CarFront size={21} />
      </div>
      <div className="automobile-wordmark">
        VICTOR PEDRO<em>AUTOMOBILE</em>
        <small>{SITE.domain}</small>
      </div>
    </>
  );
}
