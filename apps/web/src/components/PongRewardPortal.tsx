import { PongRewardComparison } from "@grove/tree-visuals";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function PongRewardPortal({ locale = "en" }: { locale?: "en" | "pt-BR" }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.querySelector<HTMLElement>("[data-pong-reward-comparison]"));
  }, []);

  return target ? createPortal(<PongRewardComparison locale={locale} />, target) : null;
}
