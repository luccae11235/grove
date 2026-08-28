import { MdpTrajectoryMachine } from "@grove/tree-visuals";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function MdpTrajectoryPortal({ locale = "en" }: { locale?: "en" | "pt-BR" }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.querySelector<HTMLElement>("[data-mdp-trajectory-machine-slot]"));
  }, []);

  return target ? createPortal(<MdpTrajectoryMachine locale={locale} />, target) : null;
}
