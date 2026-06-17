import { type ClassValue, clsx } from "clsx";
import { formatRelative } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function abbreviateName(name: string): string {
  const parts = name.split(" ");
  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataURL = reader.result as string;
      const data = dataURL.split(",")[1];
      resolve(data);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
}

export function getUniqueId(): number {
  return Math.floor(Math.random() * 1000000000);
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US");
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US");
}

export function formatDateTime(date: Date): string {
  return formatRelative(date, new Date());
}

export function formatNumber(x: number | undefined | null) {
  if (!x) return "0";
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Formats a billing period (in days) into a human-readable suffix like "/tháng".
 * A value of 0 or less means the plan has no fixed day-based duration and falls
 * back to a monthly recurring period (e.g. LemonSqueezy subscriptions).
 */
export function formatBillingPeriod(days?: number | null): string {
  if (!days || days <= 0) return "/tháng";

  switch (days) {
    case 1:
      return "/ngày";
    case 7:
      return "/tuần";
    case 30:
    case 31:
      return "/tháng";
    case 365:
    case 366:
      return "/năm";
    default:
      return `/${formatNumber(days)} ngày`;
  }
}
