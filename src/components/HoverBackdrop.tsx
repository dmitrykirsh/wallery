import { AnimatePresence, motion } from "framer-motion";
import { useHoverBackground } from "../lib/HoverBackgroundContext";

/** A full-viewport, heavily blurred + darkened preview of whichever
 * wallpaper card the pointer is currently over, sitting behind all app
 * content — gives hovering a sense of "this is what it'd feel like". */
export default function HoverBackdrop() {
  const { image } = useHoverBackground();

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <AnimatePresence>
        {image && (
          <motion.img
            key={image}
            src={image}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="h-full w-full object-cover"
            style={{ filter: "blur(50px) brightness(0.35) saturate(130%)", transform: "scale(1.1)" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
