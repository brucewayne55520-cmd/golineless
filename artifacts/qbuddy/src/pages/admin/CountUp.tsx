import { motion } from "framer-motion";

export default function CountUp({ value, prefix = "" }: { value: number; prefix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {prefix}{value?.toLocaleString("en-IN") ?? 0}
    </motion.span>
  );
}
