import { SITE } from "@/lib/config";
export default function Brand() {
  return (
    <>
      <img
        className="automobile-mark"
        src="/brand-icon.svg"
        alt="Victor Pedro Automobile logo"
        width={64}
        height={64}
      />
      <div className="automobile-wordmark">
        VICTOR PEDRO<em>AUTOMOBILE</em>
        <small>{SITE.domain}</small>
      </div>
    </>
  );
}
